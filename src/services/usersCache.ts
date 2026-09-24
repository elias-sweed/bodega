import type { UsuariosAutorizadosRow } from '../types/database.types'
import { fetchUsuariosAutorizados } from './users'

type Listener = () => void

let cache: UsuariosAutorizadosRow[] | null = null
let errorState: string | null = null
let inFlight: Promise<void> | null = null
let cacheGeneration = 0
const listeners = new Set<Listener>()

function notify(): void {
  const snapshot = Array.from(listeners)
  for (const listener of snapshot) listener()
}

async function load(force = false): Promise<void> {
  if (inFlight) {
    await inFlight
    if (force) return load(true)
    return
  }
  if (cache !== null && !force) return
  const generation = cacheGeneration
  inFlight = (async () => {
    try {
      const data = await fetchUsuariosAutorizados()
      if (generation === cacheGeneration) {
        cache = data
        errorState = null
      }
    } catch (cause) {
      if (generation === cacheGeneration) {
        errorState =
          cause instanceof Error
            ? cause.message
            : 'No se pudo cargar el listado'
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

export function getUsersCache(): {
  usuarios: UsuariosAutorizadosRow[] | null
  error: string | null
} {
  return { usuarios: cache, error: errorState }
}

export function subscribeToUsers(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function ensureUsersLoaded(): void {
  void load()
}

export function refreshUsersCache(): Promise<void> {
  return load(true)
}

export function resetUsersCache(): void {
  cacheGeneration += 1
  cache = null
  errorState = null
  inFlight = null
  notify()
}