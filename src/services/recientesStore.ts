const STORAGE_KEY = 'inventario:recientes:v1'
const MAX_IDS = 400

let cachedIds: string[] = load()

const listeners = new Set<() => void>()

function load(): string[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && id !== '')
      : []
  } catch {
    return []
  }
}

function persist(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cachedIds))
  } catch {
    // Sin almacenamiento disponible: se ignora
  }
}

function notify(): void {
  for (const listener of Array.from(listeners)) listener()
}

export function getRecientesIds(): string[] {
  return cachedIds
}

/** Registra productos agregados recientemente (los nuevos primero). */
export function addRecientes(ids: string[]): void {
  const valid = ids.filter((id): id is string => typeof id === 'string' && id !== '')
  if (valid.length === 0) return
  const seen = new Set<string>(valid)
  const merged = [...valid]
  for (const id of cachedIds) {
    if (!seen.has(id)) {
      seen.add(id)
      merged.push(id)
    }
  }
  cachedIds = merged.length > MAX_IDS ? merged.slice(0, MAX_IDS) : merged
  persist()
  notify()
}

export function subscribeRecientes(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function resetRecientesStore(): void {
  cachedIds = []
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin almacenamiento disponible: se ignora
  }
  notify()
}