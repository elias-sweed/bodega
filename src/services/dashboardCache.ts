import { subscribeToDataChanges } from './dataEvents'
import {
  fetchDashboardResumen,
  fetchProductosBajoStock,
  fetchVentasUltimos7Dias,
  type VentaDiaria,
} from './dashboard'
import type {
  DashboardResumenResult,
  ProductosRow,
} from '../types/database.types'
import type { ResumenRango } from '../hooks/useTodayProducts'

type Listener = () => void

let resumenSlot: DashboardResumenResult | null = null
let lowStockSlot: ProductosRow[] | null = null
let weeklySlot: VentaDiaria[] | null = null
const hoySlot = new Map<string, ResumenRango | null>()
let errorState: string | null = null
let inFlight: Promise<void> | null = null
let refreshTimer: number | null = null
let unsubscribeData: (() => void) | null = null
let cacheGeneration = 0
const listeners = new Set<Listener>()

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
      const [resumen, lowStock, weekly] = await Promise.all([
        fetchDashboardResumen(),
        fetchProductosBajoStock(),
        fetchVentasUltimos7Dias(),
      ])
      if (generation === cacheGeneration) {
        resumenSlot = resumen
        lowStockSlot = lowStock
        weeklySlot = weekly
        errorState = null
      }
    } catch (cause) {
      if (generation === cacheGeneration) {
        errorState =
          cause instanceof Error
            ? cause.message
            : 'No se pudo cargar el resumen'
      }
    } finally {
      if (generation === cacheGeneration) {
        inFlight = null
      }
    }
  })()
  notify()
  await inFlight
  notify()
}

function ensureChannel(): void {
  if (unsubscribeData !== null) return
  // El resumen reacciona a los mismos cambios de datos que el resto de la
  // aplicacion (ventas, compras, productos) y se refresca en segundo plano.
  unsubscribeData = subscribeToDataChanges(() => {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(() => void load(), 300)
  })
}

export function getDashboardCache(): {
  resumen: DashboardResumenResult | null
  lowStock: ProductosRow[] | null
  weekly: VentaDiaria[] | null
  error: string | null
  inFlight: boolean
} {
  return {
    resumen: resumenSlot,
    lowStock: lowStockSlot,
    weekly: weeklySlot,
    error: errorState,
    inFlight: inFlight !== null,
  }
}

export function getHoyCache(claveCache: string): ResumenRango | null {
  if (!hoySlot.has(claveCache)) return null
  return hoySlot.get(claveCache) ?? null
}

export function subscribeToDashboard(listener: Listener): () => void {
  listeners.add(listener)
  ensureChannel()
  return () => {
    listeners.delete(listener)
  }
}

export function ensureDashboardLoaded(): void {
  void load()
}

export function refreshDashboardCache(): Promise<void> {
  return load(true)
}

export function applyHoyData(
  claveCache: string,
  resumen: ResumenRango | null,
): void {
  hoySlot.set(claveCache, resumen)
  notify()
}

export function resetDashboardCache(): void {
  cacheGeneration += 1
  resumenSlot = null
  lowStockSlot = null
  weeklySlot = null
  hoySlot.clear()
  errorState = null
  inFlight = null
  if (refreshTimer !== null) window.clearTimeout(refreshTimer)
  refreshTimer = null
  unsubscribeData?.()
  unsubscribeData = null
  notify()
}
