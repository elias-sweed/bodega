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
let inFlight: Promise<ProductosRow[]> | null = null
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

async function load(): Promise<void> {
  if (inFlight) {
    await inFlight
    return
  }
  inFlight = fetchProducts()
  try {
    const data = await inFlight
    cache = sortByName(data)
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
    void load()
    return
  }
  // Refresco suave: sale disparado solo si no hay carga en curso.
  void load()
}