import { useEffect, useRef, useState } from 'react'
import { countPendingSales } from '../../services/offlineQueue'

const POLL_MS = 5_000

/**
 * Banda de estado para la usuaria: nunca deja dudas sobre qué pasa.
 * - Amarillo: sin internet (las ventas se guardan en este equipo).
 * - Ámbar: hay ventas esperando subirse.
 * - Verde (2 s): todo sincronizado → desaparece sola.
 * Además frena el cierre del navegador si hay ventas pendientes.
 */
export function SyncStatusBar() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  )
  const [pending, setPending] = useState(0)
  const [justSynced, setJustSynced] = useState(false)
  const lastPending = useRef(0)

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try {
        const n = await countPendingSales()
        if (!alive) return
        setPending((prev) => {
          if (prev > 0 && n === 0 && navigator.onLine) {
            setJustSynced(true)
            window.setTimeout(() => {
              if (alive) setJustSynced(false)
            }, 3000)
          }
          return n
        })
        lastPending.current = n
      } catch {
        /* IndexedDB no disponible: no mostramos nada falso */
      }
    }
    void refresh()
    const id = window.setInterval(() => void refresh(), POLL_MS)
    const goOnline = () => {
      setOnline(true)
      void refresh()
    }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      alive = false
      window.clearInterval(id)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // Cierre seguro: si hay ventas sin subir, el navegador pide confirmación.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (pending > 0) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [pending])

  if (!online) {
    return (
      <div role="status" className="rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-sm font-bold text-amber-200">
        🟡 Sin internet: las ventas se guardan en este equipo y se subirán solas.
        {pending > 0 ? ` (${pending} pendiente${pending === 1 ? '' : 's'})` : ''}
      </div>
    )
  }
  if (pending > 0) {
    return (
      <div role="status" className="rounded-xl border border-sky-400/40 bg-sky-400/15 px-4 py-2 text-sm font-bold text-sky-200">
        ⏳ {pending} venta{pending === 1 ? '' : 's'} pendiente{pending === 1 ? '' : 's'}: se
        subirán solas a la nube.
      </div>
    )
  }
  if (justSynced) {
    return (
      <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-4 py-2 text-sm font-bold text-emerald-200">
        ✅ Todo sincronizado.
      </div>
    )
  }
  return null
}
