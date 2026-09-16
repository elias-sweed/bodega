import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ProductosRow } from '../types/database.types'
import { fetchProducts } from './products'
import { supabase } from './supabase'

/**
 * Tienda en memoria de productos + suscripción "en vivo".
 *
 * El catálogo se carga UNA vez (o se refresca cuando algo cambia) y se comparte
 * entre pantallas. Así, al navegar entre secciones no se vuelve a mostrar
 * "Cargando…" ni se descarga todo de nuevo, y cualquier venta/compra que
 * cambie el stock se refleja al instante en TODAS las pantallas.
 *
 * Requisito: la tabla `productos` debe estar en la publicación de Supabase
 * Realtime (ver supabase/realtime.sql).
 */

type Listener = () => void

let cache: ProductosRow[] | null = null
let errorState: string | null = null
let inFlight: Promise<void> | null = null
let queuedForce = false
let channel: RealtimeChannel | null = null
let refreshTimer: number | null = null
const listeners = new Set<Listener>()

function sortByName(products: ProductosRow[]): ProductosRow[] {
  return [...products].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function notify(): void {
  for (const listener of Array.from(listeners)) {
    listener()
  }
}

async function fetcher(): Promise<void> {
  const data = await fetchProducts()
  cache = sortByName(data)
  errorState = null
}

async function load(): Promise<void> {
  const force = queuedForce
  queuedForce = false

  if (inFlight) {
    if (!force) {
      await inFlight
      return
    }
    // Refresco forzado: aunque haya una carga en curso, encadena OTRO viaje a la
    // base de datos para que el nuevo stock se vea al instante.
    const current = inFlight
    inFlight = (async () => {
      try {
        await current
      } catch {
        // se ignora: abajo se lanza el nuevo viaje
      }
      await fetcher()
    })()
  } else {
    inFlight = fetcher()
  }

  try {
    await inFlight
  } catch (cause) {
    if (cache === null) {
      errorState =
        cause instanceof Error ? cause.message : 'Error al cargar los productos'
    }
  } finally {
    inFlight = null
    notify()
  }
}

function ensureChannel(): void {
  if (channel) return
  channel = supabase
    .channel('productos-en-vivo')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'productos' },
      () => {
        if (refreshTimer) {
          window.clearTimeout(refreshTimer)
        }
        refreshTimer = window.setTimeout(() => {
          void load()
        }, 400)
      },
    )
    .subscribe()
}

export function getProductsCache(): {
  products: ProductosRow[] | null
  error: string | null
} {
  return { products: cache, error: errorState }
}

export function subscribeToProducts(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function ensureProductsLoaded(): void {
  if (cache === null) {
    void load()
  }
  ensureChannel()
}

export function refreshProductsCache(force = false): void {
  if (force) {
    queuedForce = true
  }
  void load()
}

/**
 * Actualiza el stock en memoria al instante (sin esperar a la red) tras una
 * venta, para que el producto agotado desaparezca de la pantalla al momento.
 */
export function applyStockChanges(
  changes: { id: string; stockActual: number }[],
): void {
  if (cache === null) return
  cache = sortByName(
    cache.map((product) => {
      const change = changes.find((item) => item.id === product.id)
      return change ? { ...product, stock_actual: change.stockActual } : product
    }),
  )
  notify()
}