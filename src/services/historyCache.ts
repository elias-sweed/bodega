import type {
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'
import { fetchIngresosHistory, fetchVentasHistory } from './history'
import { fetchProducts } from './products'
import { fetchProveedores } from './purchases'

type Listener = () => void

let ventasCache: VentasRow[] | null = null
let ingresosCache: IngresosMercaderiaRow[] | null = null
let proveedorMap: Record<string, string> = {}
let productoMap: Record<string, string> = {}
let ventasError: string | null = null
let ingresosError: string | null = null
let ventasInFlight: Promise<void> | null = null
let ingresosInFlight: Promise<void> | null = null
let cacheGeneration = 0
const listeners = new Set<Listener>()

function notify(): void {
  const snapshot = Array.from(listeners)
  for (const listener of snapshot) listener()
}

async function loadVentas(force = false): Promise<void> {
  if (ventasInFlight) {
    await ventasInFlight
    if (force) return loadVentas(true)
    return
  }
  if (ventasCache !== null && !force) return
  const generation = cacheGeneration
  ventasInFlight = (async () => {
    try {
      const data = await fetchVentasHistory()
      if (generation === cacheGeneration) {
        ventasCache = data
        ventasError = null
      }
    } catch (cause) {
      if (generation === cacheGeneration) {
        ventasError =
          cause instanceof Error
            ? cause.message
            : 'No se pudo cargar el historial de ventas'
      }
    } finally {
      if (generation === cacheGeneration) {
        ventasInFlight = null
        notify()
      }
    }
  })()
  await ventasInFlight
  notify()
}

async function loadIngresos(force = false): Promise<void> {
  if (ingresosInFlight) {
    await ingresosInFlight
    if (force) return loadIngresos(true)
    return
  }
  if (ingresosCache !== null && !force) return
  const generation = cacheGeneration
  ingresosInFlight = (async () => {
    try {
      const [data, proveedores, productos] = await Promise.all([
        fetchIngresosHistory(),
        fetchProveedores(),
        fetchProducts(),
      ])
      if (generation === cacheGeneration) {
        ingresosCache = data
        proveedorMap = Object.fromEntries(
          proveedores.map((row) => [row.id, row.nombre]),
        )
        productoMap = Object.fromEntries(
          productos.map((row) => [row.id, row.nombre]),
        )
        ingresosError = null
      }
    } catch (cause) {
      if (generation === cacheGeneration) {
        ingresosError =
          cause instanceof Error
            ? cause.message
            : 'No se pudo cargar el historial de compras'
      }
    } finally {
      if (generation === cacheGeneration) {
        ingresosInFlight = null
        notify()
      }
    }
  })()
  await ingresosInFlight
  notify()
}

export function getHistoryCache(): {
  ventas: VentasRow[] | null
  ingresos: IngresosMercaderiaRow[] | null
  proveedorMap: Record<string, string>
  productoMap: Record<string, string>
  ventasError: string | null
  ingresosError: string | null
} {
  return {
    ventas: ventasCache,
    ingresos: ingresosCache,
    proveedorMap,
    productoMap,
    ventasError,
    ingresosError,
  }
}

export function subscribeToHistory(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function ensureVentasHistoryLoaded(): void {
  void loadVentas()
}

export function ensureIngresosHistoryLoaded(): void {
  void loadIngresos()
}

export function refreshVentasHistory(): Promise<void> {
  return loadVentas(true)
}

export function refreshIngresosHistory(): Promise<void> {
  return loadIngresos(true)
}

export function resetHistoryCache(): void {
  cacheGeneration += 1
  ventasCache = null
  ingresosCache = null
  proveedorMap = {}
  productoMap = {}
  ventasError = null
  ingresosError = null
  ventasInFlight = null
  ingresosInFlight = null
  notify()
}