import { useMemo } from 'react'
import { ClipboardList, RotateCcw, SearchX, TriangleAlert } from 'lucide-react'
import { useIngresosHistory } from '../../hooks/useHistory'
import { fechaEnRango, formatFechaCorta, formatHora, enFranja } from '../../utils/format'
import {
  esAjusteIngreso,
  groupByCompra,
  proveedorDeCompra,
} from './ingresos'
import { HistorySkeleton } from './HistorySkeleton'
import type { HistoryFilter } from './types'
import { describeFilter } from './types'

interface AjusteEntry {
  key: string
  fecha: string
  producto: string
  cantidad: number
  motivo: string
  salida: boolean
}

function matchesFilter(entry: AjusteEntry, filter: HistoryFilter): boolean {
  if (!fechaEnRango(entry.fecha, filter.from, filter.to)) return false
  if (!enFranja(entry.fecha, filter.franja)) return false
  const query = filter.query.trim().toLowerCase()
  if (query === '') return true
  return (
    entry.producto.toLowerCase().includes(query) ||
    entry.motivo.toLowerCase().includes(query)
  )
}

export function AjustesTab({ filter }: { filter: HistoryFilter }) {
  const { ingresos, proveedorMap, productoMap, loading, error, refresh } =
    useIngresosHistory()

  const ajustes = useMemo(() => {
    const filas = ingresos.filter(esAjusteIngreso)
    return groupByCompra(filas).map<AjusteEntry>((compra) => {
      const cantidad = compra.items.reduce(
        (sum, item) => sum + item.cantidad_ingresada,
        0,
      )
      return {
        key: compra.key,
        fecha: compra.fecha,
        producto:
          compra.items
            .map((item) => productoMap[item.producto_id ?? ''] ?? 'Producto eliminado')
            .join(', ') || 'Producto eliminado',
        cantidad,
        motivo:
          compra.items.find((item) => item.motivo)?.motivo ??
          proveedorDeCompra(compra, proveedorMap),
        salida: cantidad < 0,
      }
    })
  }, [ingresos, productoMap, proveedorMap])

  const filteredAjustes = useMemo(
    () => ajustes.filter((entry) => matchesFilter(entry, filter)),
    [ajustes, filter],
  )

  if (loading && ingresos.length === 0) {
    return <HistorySkeleton />
  }

  if (error && ingresos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-200/25 bg-rose-500/15 p-8 text-center shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/25 text-rose-100">
          <TriangleAlert size={22} aria-hidden="true" />
        </span>
        <p className="text-lg font-extrabold tracking-tight text-ink">{error}</p>
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

  if (ingresos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] border border-line bg-surface p-12 text-center shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
          <ClipboardList size={26} aria-hidden="true" />
        </span>
        <p className="text-lg font-black tracking-tight text-ink">
          Vacío, y eso es normal.
        </p>
        <p className="max-w-md text-sm font-medium leading-relaxed text-muted">
          Aquí solo aparecen las correcciones: algo vencido, dañado, lo que se
          consumió en casa o un conteo mal hecho. Todo lo que vendes está en
          Ventas y todo lo que compras está en Compras.
        </p>
      </div>
    )
  }

  if (filteredAjustes.length === 0) {
    const detalle = describeFilter(filter)
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] border border-line bg-surface p-12 text-center shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
          <SearchX size={26} aria-hidden="true" />
        </span>
        <p className="text-lg font-black tracking-tight text-ink">
          {detalle
            ? `No hay ajustes ${detalle}.`
            : 'No hay ajustes que coincidan con el filtro.'}
        </p>
        <p className="text-sm font-medium text-muted">
          Prueba con otro día, horario o búsqueda.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-muted backdrop-blur-2xl">
        Aquí ves los cambios de stock que <span className="font-black text-ink">no fueron ventas ni compras</span>:
        productos vencidos, dañados, consumo de la casa y correcciones de conteo.
      </p>
      <ul className="flex flex-col gap-2">
        {filteredAjustes.map((entry) => (
          <li
            key={entry.key}
            className="flex items-center justify-between gap-4 rounded-[28px] border border-line bg-surface px-5 py-4 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-300 hover:bg-surface-2"
          >
            <div className="min-w-0">
              <span className={`mb-1 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide backdrop-blur-xl ${
                entry.salida
                  ? 'border-rose-200/30 bg-rose-400/20 text-rose-100'
                  : 'border-emerald-200/30 bg-emerald-400/20 text-emerald-100'
              }`}>
                {entry.salida ? 'Salió del inventario' : 'Entró al inventario'}
              </span>
              <span className="block truncate text-base font-black tracking-tight text-ink">
                {entry.producto}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-extrabold text-ink">
                  {formatFechaCorta(entry.fecha)}
                </span>
                <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-black tabular-nums text-ink">
                  {formatHora(entry.fecha)}
                </span>
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-muted">
                Motivo: {entry.motivo}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-xs font-bold uppercase tracking-wide text-muted">
                Movimiento
              </span>
              <span
                className={`text-lg font-black tracking-tight ${
                  entry.salida ? 'text-rose-200' : 'text-emerald-200'
                }`}
              >
                {entry.salida ? '−' : '+'}
                {Math.abs(entry.cantidad)} u.
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
