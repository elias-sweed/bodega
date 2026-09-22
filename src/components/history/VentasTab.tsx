import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ChevronDown, ReceiptText, RotateCcw, SearchX, TriangleAlert } from 'lucide-react'
import { useVentasHistory } from '../../hooks/useHistory'
import {
  fetchDetalleVenta,
  fetchDetallesByVentas,
  fetchProductNames,
} from '../../services/history'
import type { DetalleVentasRow, VentasRow } from '../../types/database.types'
import { formatFechaCorta, formatHora, formatMoney, shortId, fechaEnRango, enFranja, claveDia, claveHoy } from '../../utils/format'
import { Toast } from '../common/Toast'
import { HistorySkeleton } from './HistorySkeleton'
import type { HistoryFilter } from './types'
import { describeFilter } from './types'

interface VentaDetail {
  items: DetalleVentasRow[]
  products: Record<string, { nombre: string; costo: number }>
}

type Notice = {
  type: 'success' | 'error'
  message: string
}

const SUMMARIES_CACHE_KEY = 'bodega:ventas-summaries-cache:v1'

interface VentaSummary {
  texto: string
  ganancia: number
}

function readSummariesCache(): Record<string, VentaSummary> {
  try {
    const raw = localStorage.getItem(SUMMARIES_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { summaries?: Record<string, VentaSummary | string> }
    const out: Record<string, VentaSummary> = {}
    for (const [id, value] of Object.entries(parsed?.summaries ?? {})) {
      // Migración: antes solo se guardaba el texto
      out[id] = typeof value === 'string' ? { texto: value, ganancia: 0 } : value
    }
    return out
  } catch {
    return {}
  }
}

function writeSummariesCache(summaries: Record<string, VentaSummary>): void {
  try {
    // Se guardan los últimos 500 para no llenar el almacenamiento
    const entries = Object.entries(summaries).slice(-500)
    localStorage.setItem(
      SUMMARIES_CACHE_KEY,
      JSON.stringify({ summaries: Object.fromEntries(entries) }),
    )
  } catch {
    // almacenamiento lleno o bloqueado: no es crítico
  }
}

const METODO_BADGES: Record<string, string> = {
  Efectivo: 'border border-emerald-200/30 bg-emerald-400/20 text-emerald-100',
  Yape: 'border border-sky-200/30 bg-sky-400/20 text-sky-100',
  Plin: 'border border-violet-200/30 bg-violet-400/20 text-violet-100',
}

function matchesFilter(venta: VentasRow, filter: HistoryFilter, numero: number): boolean {
  if (!fechaEnRango(venta.fecha, filter.from, filter.to)) return false
  if (!enFranja(venta.fecha, filter.franja)) return false
  const query = filter.query.trim().toLowerCase()
  if (query === '') return true
  return (
    shortId(venta.id).includes(query) ||
    venta.id.toLowerCase().includes(query) ||
    formatFechaCorta(venta.fecha).includes(query) ||
    String(numero) === query
  )
}

export function VentasTab({ filter }: { filter: HistoryFilter }) {
  const navigate = useNavigate()
  const { ventas, loading, error, refresh } = useVentasHistory()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, VentaDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, VentaSummary>>(() =>
    readSummariesCache(),
  )
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

  // Resumen de productos por venta (una sola consulta para todas)
  useEffect(() => {
    if (ventas.length === 0) return
    let cancelled = false
    void (async () => {
      try {
        const items = await fetchDetallesByVentas(ventas.map((v) => v.id))
        const ids = [...new Set(items.map((i) => i.producto_id).filter((id): id is string => id !== null))]
        const rows = await fetchProductNames(ids)
        const names = new Map(rows.map((r) => [r.id, r.nombre] as const))
        const costos = new Map(rows.map((r) => [r.id, r.costo] as const))
        const byVenta = new Map<string, DetalleVentasRow[]>()
        for (const item of items) {
          const list = byVenta.get(item.venta_id) ?? []
          list.push(item)
          byVenta.set(item.venta_id, list)
        }
        const result: Record<string, VentaSummary> = {}
        for (const [ventaId, list] of byVenta) {
          const parts = list.map(
            (item) => `${names.get(item.producto_id ?? '') ?? 'Producto eliminado'} × ${item.cantidad}`,
          )
          const ganancia = list.reduce((sum, item) => {
            const costo = item.costo_unitario ?? costos.get(item.producto_id ?? '') ?? 0
            return sum + (item.subtotal - costo * item.cantidad)
          }, 0)
          result[ventaId] = {
            texto: parts.slice(0, 2).join(', ') + (parts.length > 2 ? ` +${parts.length - 2} más` : ''),
            ganancia,
          }
        }
        if (!cancelled) {
          setSummaries(result)
          writeSummariesCache(result)
        }
      } catch {
        // Sin resumen: las filas muestran la fecha como antes
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ventas])

  // Número simple y estable: la venta más reciente es la N.º 1
  const numeroById = useMemo(
    () => new Map(ventas.map((venta, i) => [venta.id, i + 1] as const)),
    [ventas],
  )

  const filteredVentas = useMemo(
    () => ventas.filter((venta) => matchesFilter(venta, filter, numeroById.get(venta.id) ?? 0)),
    [ventas, filter, numeroById],
  )

  const totalVendido = useMemo(
    () => filteredVentas.reduce((sum, venta) => sum + venta.total, 0),
    [filteredVentas],
  )

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
      const products: Record<string, { nombre: string; costo: number }> = {}
      for (const row of rows) {
        products[row.id] = { nombre: row.nombre, costo: row.costo }
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

  if (loading && ventas.length === 0) {
    return <HistorySkeleton />
  }

  if (error && ventas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-200/25 bg-rose-500/15 p-8 text-center shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/25 text-rose-100">
          <TriangleAlert size={22} aria-hidden="true" />
        </span>
        <p className="text-lg font-extrabold tracking-tight text-white">{error}</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  if (ventas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] border border-white/15 bg-white/10 p-12 text-center shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white/70">
          <ReceiptText size={26} aria-hidden="true" />
        </span>
        <p className="text-lg font-black tracking-tight text-white">
          No hay ventas registradas todavía.
        </p>
        <p className="text-sm font-medium text-white/60">
          Las ventas que registres en Caja aparecerán aquí.
        </p>
      </div>
    )
  }

  if (filteredVentas.length === 0) {
    const detalle = describeFilter(filter)
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] border border-white/15 bg-white/10 p-12 text-center shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white/70">
          <SearchX size={26} aria-hidden="true" />
        </span>
        <p className="text-lg font-black tracking-tight text-white">
          {detalle
            ? `No hay ventas ${detalle}.`
            : 'No hay ventas que coincidan con el filtro.'}
        </p>
        <p className="text-sm font-medium text-white/60">
          Prueba con otro día, horario o búsqueda.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 rounded-[28px] border border-white/25 bg-gradient-to-br from-white/25 via-white/10 to-white/5 px-5 py-4 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="text-sm font-bold text-white/70">
          Total ventas registradas
        </span>
        <span className="text-xl font-black tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]">{formatMoney(totalVendido)}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {filteredVentas.map((venta) => {
          const expanded = expandedId === venta.id
          const detail = details[venta.id]
          const loadingDetail = detailLoadingId === venta.id

          const costoTotal = detail
            ? detail.items.reduce((total, item) => {
                const producto = detail.products[item.producto_id ?? '']
                const costoUnitario = item.costo_unitario ?? producto?.costo ?? 0
                return total + costoUnitario * item.cantidad
              }, 0)
            : 0
          const ganancia = venta.total - costoTotal

          return (
            <li key={venta.id} className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => void handleToggle(venta)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-all duration-300 hover:bg-white/10"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="shrink-0 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-black tabular-nums text-white">
                      N.º {numeroById.get(venta.id) ?? '—'}
                    </span>
                    <span className="truncate text-base font-extrabold tracking-tight text-white">
                      {summaries[venta.id]?.texto ?? '···'}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-0.5 text-xs font-semibold text-white/55">
                    <span className="tabular-nums">
                      {formatFechaCorta(venta.fecha)} · {formatHora(venta.fecha)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-px text-[11px] font-bold backdrop-blur-xl ${
                        METODO_BADGES[venta.metodo_pago] ?? 'border border-white/20 bg-white/10 text-white/70'
                      }`}
                    >
                      {venta.metodo_pago ?? 'Efectivo'}
                    </span>
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-xl font-black tracking-tighter tabular-nums text-white">
                      {formatMoney(venta.total)}
                    </span>
                    {summaries[venta.id] !== undefined && (
                      <span
                        className={`rounded-full border px-2 py-px text-[11px] font-black tabular-nums ${
                          summaries[venta.id].ganancia >= 0
                            ? 'border-emerald-200/40 bg-emerald-400/20 text-emerald-100'
                            : 'border-rose-200/40 bg-rose-400/20 text-rose-100'
                        }`}
                        title="Lo que ganaste en esta venta"
                      >
                        +{formatMoney(summaries[venta.id].ganancia)}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-white/50 transition-transform duration-300 ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  >
                    <ChevronDown size={18} />
                  </span>
                </span>
              </button>

              {expanded && (
                <div className="fade-in border-t border-white/10 px-5 py-4">
                  {loadingDetail ? (
                    <p className="text-sm font-medium text-white/55">Cargando detalle…</p>
                  ) : detail ? (
                    <div className="flex flex-col gap-3">
                      <ul className="flex flex-col gap-2">
                        {detail.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-4 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate font-bold text-white">
                              {detail.products[item.producto_id ?? '']?.nombre ??
                                'Producto eliminado'}
                              <span className="block truncate text-xs font-semibold text-white/55">
                                {item.cantidad} × {formatMoney(item.precio_unitario)} cada uno
                              </span>
                            </span>
                            <span className="shrink-0 font-black tabular-nums text-white">
                              {formatMoney(item.subtotal)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm backdrop-blur-xl">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium text-white/65">Lo vendió</span>
                          <span className="truncate font-bold text-white">
                            {venta.creado_por ?? '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium text-white/65">El cliente pagó en total</span>
                          <span className="font-black tabular-nums text-white">
                            {formatMoney(venta.total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium text-white/65">
                            A ti te habían costado
                          </span>
                          <span className="font-bold tabular-nums text-white/75">
                            − {formatMoney(costoTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-2">
                          <span className="font-black text-white">
                            Te quedaron (ganancia)
                          </span>
                          <span
                            className={`text-base font-black tabular-nums ${
                              ganancia >= 0 ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {formatMoney(ganancia)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const clave = claveDia(venta.fecha)
                          // Si es hoy, al dashboard normal (sin vista de día)
                          navigate('/', {
                            state: clave === claveHoy() ? null : { fechaVista: clave },
                          })
                        }}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/20 active:scale-[0.98]"
                      >
                        <BarChart3 size={16} aria-hidden="true" />
                        Ver resumen de este día
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-white/55">
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
