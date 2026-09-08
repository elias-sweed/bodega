import { useEffect, useRef, useState } from 'react'
import { useVentasHistory } from '../../hooks/useHistory'
import {
  fetchDetalleVenta,
  fetchProductNames,
} from '../../services/history'
import type { DetalleVentasRow, VentasRow } from '../../types/database.types'
import { formatDateTime, formatMoney, shortId } from '../../utils/format'
import { Toast } from '../common/Toast'

interface VentaDetail {
  items: DetalleVentasRow[]
  products: Record<string, string>
}

type Notice = {
  type: 'success' | 'error'
  message: string
}

export function VentasTab() {
  const { ventas, loading, error, refresh } = useVentasHistory()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, VentaDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    return () => window.clearTimeout(noticeTimer.current)
  }, [])

  const showNotice = (message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ type: 'error', message })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }

  const handleToggle = async (venta: VentasRow): Promise<void> => {
    if (expandedId === venta.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(venta.id)

    if (details[venta.id]) {
      return
    }

    setDetailLoadingId(venta.id)
    try {
      const items = await fetchDetalleVenta(venta.id)
      const ids = items
        .map((item) => item.producto_id)
        .filter((id): id is string => id !== null)
      const rows = await fetchProductNames(ids)
      const products: Record<string, string> = {}
      for (const row of rows) {
        products[row.id] = row.nombre
      }
      setDetails((current) => ({
        ...current,
        [venta.id]: { items, products },
      }))
    } catch {
      showNotice('No se pudo cargar el detalle de la venta.')
    } finally {
      setDetailLoadingId(null)
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-lg text-slate-400">Cargando ventas…</p>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-rose-50 p-8 text-center">
        <p className="text-lg font-semibold text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (ventas.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-500">
          No hay ventas registradas todavía.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {ventas.map((venta) => {
          const expanded = expandedId === venta.id
          const detail = details[venta.id]
          const loadingDetail = detailLoadingId === venta.id

          return (
            <li key={venta.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => void handleToggle(venta)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    #{shortId(venta.id)}
                  </span>
                  <span className="text-slate-800">
                    {formatDateTime(venta.fecha)}
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-lg font-bold text-slate-900">
                    {formatMoney(venta.total)}
                  </span>
                  <span
                    className={`text-slate-400 transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </span>
              </button>

              {expanded && (
                <div className="border-t border-slate-100 px-5 py-4">
                  {loadingDetail ? (
                    <p className="text-sm text-slate-400">Cargando detalle…</p>
                  ) : detail ? (
                    <ul className="flex flex-col gap-2">
                      {detail.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate text-slate-700">
                            {detail.products[item.producto_id ?? ''] ??
                              'Producto eliminado'}
                            <span className="text-slate-400">
                              {' '}
                              × {item.cantidad}
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold text-slate-800">
                            {formatMoney(item.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No se pudo cargar el detalle.
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {notice && <Toast type={notice.type} message={notice.message} />}
    </div>
  )
}