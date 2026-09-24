import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'

type Listener = () => void

export interface ReporteCacheSlot {
  ventas: VentasRow[]
  ingresos: IngresosMercaderiaRow[]
  detalles: DetalleVentasRow[]
  productos: Map<string, { nombre: string; costo: number }>
  error: string | null
}

const slots = new Map<string, ReporteCacheSlot>()
const inFlight = new Map<string, Promise<void>>()
const listeners = new Set<Listener>()

function key(desdeISO: string, hastaISO: string): string {
  return `${desdeISO}|${hastaISO}`
}

function notify(): void {
  const snapshot = Array.from(listeners)
  for (const listener of snapshot) listener()
}

export function getReporteCache(
  desdeISO: string,
  hastaISO: string,
): ReporteCacheSlot | null {
  return slots.get(key(desdeISO, hastaISO)) ?? null
}

export function subscribeToReporte(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function applyReporteData(
  desdeISO: string,
  hastaISO: string,
  slot: ReporteCacheSlot,
): void {
  slots.set(key(desdeISO, hastaISO), slot)
  notify()
}

export function resetReporteCache(): void {
  slots.clear()
  inFlight.clear()
  notify()
}