import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ProductosRow } from '../types/database.types'
import { fetchProducts } from './products'
import { addRecientes } from './recientesStore'
import { supabase } from './supabase'

type Listener = () => void

let cache: ProductosRow[] | null = null
let errorState: string | null = null
let inFlight: Promise<void> | null = null
let channel: RealtimeChannel | null = null
let refreshTimer: number | null = null
let cacheGeneration = 0
const listeners = new Set<Listener>()

function sortByName(products: ProductosRow[]): ProductosRow[] {
  return [...products].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function notify(): void {
  for (const listener of Array.from(listeners)) listener()
}

async function load(forceAfterCurrent = false): Promise<void> {
  if (inFlight) {
    await inFlight
    if (forceAfterCurrent) return load()
    return
  }

  const generation = cacheGeneration
  inFlight = (async () => {
    try {
      const products = await fetchProducts()
      if (generation === cacheGeneration) {
        const next = sortByName(products)
        // Cualquier producto que aparezca por primera vez en la caché es
        // "agregado recientemente", sin depender de created_at ni de la RPC.
        if (cache !== null) {
          const previousIds = new Set(cache.map((product) => product.id))
          const freshIds = next
            .filter((product) => !previousIds.has(product.id))
            .map((product) => product.id)
          if (freshIds.length > 0) addRecientes(freshIds)
        }
        cache = next
        errorState = null
      }
    } catch (cause) {
      if (generation === cacheGeneration) {
        errorState =
          cause instanceof Error ? cause.message : 'No se pudieron cargar los productos'
      }
    } finally {
      if (generation === cacheGeneration) {
        inFlight = null
        notify()
      }
    }
  })()

  await inFlight
}

function ensureChannel(): void {
  if (channel) return
  channel = supabase
    .channel('productos-en-vivo')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'productos' },
      () => {
        if (refreshTimer !== null) window.clearTimeout(refreshTimer)
        refreshTimer = window.setTimeout(() => void load(), 300)
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
  return () => listeners.delete(listener)
}

export function ensureProductsLoaded(): void {
  void load()
  ensureChannel()
}

export function refreshProductsCache(): Promise<void> {
  return load(true)
}

export function applyStockChanges(
  changes: { id: string; stockActual: number }[],
): void {
  if (cache === null) return
  const byId = new Map(changes.map((change) => [change.id, change.stockActual]))
  cache = sortByName(
    cache.map((product) => {
      const stock = byId.get(product.id)
      return stock === undefined ? product : { ...product, stock_actual: stock }
    }),
  )
  notify()
}

export function resetProductsCache(): void {
  cacheGeneration += 1
  cache = null
  errorState = null
  inFlight = null
  if (refreshTimer !== null) window.clearTimeout(refreshTimer)
  refreshTimer = null
  void channel?.unsubscribe()
  channel = null
}
