import { useCallback, useEffect, useRef } from 'react'
import { countPendingSales, isOffline } from '../services/offlineQueue'
import { emitDataChanged } from '../services/dataEvents'
import { syncPendingSales, type SyncSummary } from '../services/syncPendingSales'

const INTERVAL_MS = 30_000

/**
 * Sube automáticamente las ventas pendientes: al cargar la app, cada 30 s,
 * y apenas el dispositivo recupera internet. Una sola sincronización a la vez.
 */
export function useAutoSync(onResult?: (summary: SyncSummary) => void): void {
  const runningRef = useRef(false)
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const run = useCallback(async () => {
    if (runningRef.current || isOffline()) return
    try {
      const pending = await countPendingSales()
      if (pending === 0) return
    } catch {
      return
    }
    runningRef.current = true
    try {
      const summary = await syncPendingSales()
      if (summary.synced > 0) {
        emitDataChanged()
      }
      onResultRef.current?.(summary)
    } catch (cause) {
      console.error('Error inesperado al sincronizar ventas offline:', cause)
    } finally {
      runningRef.current = false
    }
  }, [])

  useEffect(() => {
    void run()
    window.addEventListener('online', run)
    const id = window.setInterval(() => void run(), INTERVAL_MS)
    return () => {
      window.removeEventListener('online', run)
      window.clearInterval(id)
    }
  }, [run])
}
