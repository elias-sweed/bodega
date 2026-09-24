import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ProveedoresRow } from '../types/database.types'
import { fetchProveedores } from './purchases'
import { supabase } from './supabase'

type Listener = () => void

let cache: ProveedoresRow[] | null = null
let errorState: string | null = null
let inFlight: Promise<void> | null = null
let channel: RealtimeChannel | null = null
let refreshTimer: number | null = null
let cacheGeneration = 0
const listeners = new Set<Listener>()

function sortByName(proveedores: ProveedoresRow[]): ProveedoresRow[] {
  return [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

function notify(): void {
  const snapshot = Array.from(listeners)
  for (const listener of snapshot) listener()
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
      const proveedores = await fetchProveedores()
      if (generation === cacheGeneration) {
        cache = sortByName(proveedores)
        errorState = null
      }
    } catch (cause) {
      if (generation === cacheGeneration) {
        errorState =
          cause instanceof Error
            ? cause.message
            : 'No se pudieron cargar los proveedores'
      }
    } finally {
      if (generation === cacheGeneration) {
        inFlight = null
        notify()
      }
    }
  })()
  await inFlight
  notify()
}

function ensureChannel(): void {
  if (channel) return
  channel = supabase
    .channel('proveedores-en-vivo')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'proveedores' },
      () => {
        if (refreshTimer !== null) window.clearTimeout(refreshTimer)
        refreshTimer = window.setTimeout(() => void load(), 300)
      },
    )
    .subscribe()
}

export function getProveedoresCache(): {
  proveedores: ProveedoresRow[] | null
  error: string | null
} {
  return { proveedores: cache, error: errorState }
}

export function subscribeToProveedores(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function ensureProveedoresLoaded(): void {
  void load()
  ensureChannel()
}

export function refreshProveedoresCache(): Promise<void> {
  return load(true)
}

export function applyProveedorChanges(
  proveedores: ProveedoresRow[],
): void {
  cache = sortByName(proveedores)
  notify()
}

export function resetProveedoresCache(): void {
  cacheGeneration += 1
  cache = null
  errorState = null
  inFlight = null
  if (refreshTimer !== null) window.clearTimeout(refreshTimer)
  refreshTimer = null
  void channel?.unsubscribe()
  channel = null
}