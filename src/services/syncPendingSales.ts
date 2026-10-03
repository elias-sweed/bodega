/**
 * Sincronización automática de la cola offline.
 *
 * Recorre las ventas guardadas en el equipo y las sube a Supabase de a una.
 * - Éxito: se elimina de la cola.
 * - Duplicada (ya había subido antes): se elimina sin alarmar.
 * - Error de red: se detiene y se reintenta cuando vuelva internet.
 * - Otro error (ej. stock): se conserva en la cola y sigue con la siguiente.
 *
 * Usa la misma clave de idempotencia del momento de la venta, así Supabase
 * nunca registra la misma venta dos veces.
 */
import { registrarVentaArticulos, VentaError } from './sales'
import {
  isNetworkError,
  isOffline,
  listPendingSales,
  removePendingSale,
} from './offlineQueue'

export type SyncSummary = {
  synced: number
  failed: number
  remaining: number
  networkDown: boolean
}

function isDuplicateError(cause: unknown): boolean {
  if (cause instanceof VentaError && cause.raw) {
    const raw = cause.raw.toLowerCase()
    return raw.includes('duplic') || raw.includes('ya fue registrada')
  }
  return false
}

export async function syncPendingSales(): Promise<SyncSummary> {
  const summary: SyncSummary = {
    synced: 0,
    failed: 0,
    remaining: 0,
    networkDown: false,
  }

  if (isOffline()) {
    const pending = await listPendingSales()
    summary.remaining = pending.length
    summary.networkDown = pending.length > 0
    return summary
  }

  const pending = await listPendingSales()
  for (const sale of pending) {
    try {
      await registrarVentaArticulos(
        sale.items.map((item) => ({
          producto_id: item.productoId,
          cantidad: item.cantidad,
        })),
        sale.metodoPago,
        sale.idempotencyKey,
      )
      await removePendingSale(sale.idempotencyKey)
      summary.synced += 1
    } catch (cause) {
      if (isDuplicateError(cause)) {
        await removePendingSale(sale.idempotencyKey)
        summary.synced += 1
        continue
      }
      if (isNetworkError(cause) || isOffline()) {
        summary.networkDown = true
        break
      }
      console.error('No se pudo sincronizar la venta pendiente:', cause)
      summary.failed += 1
    }
  }

  const left = await listPendingSales()
  summary.remaining = left.length
  return summary
}
