import { useMemo } from 'react'
import { useIngresosHistory } from '../../hooks/useHistory'
import { fechaEnRango, formatDateTime } from '../../utils/format'
import {
  esAjusteIngreso,
  groupByCompra,
  proveedorDeCompra,
} from './ingresos'
import type { HistoryFilter } from './types'

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

  if (loading) {
    return <p className="py-10 text-center text-lg text-slate-400">Cargando ajustes…</p>
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

  if (ingresos.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-500">
          Aún no hay ajustes registrados. Usa "Ajustar stock" en Inventario.
        </p>
      </div>
    )
  }

  if (filteredAjustes.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-500">
          No hay ajustes que coincidan con el filtro.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {filteredAjustes.map((entry) => (
          <li
            key={entry.key}
            className="flex items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm"
          >
            <div className="min-w-0">
              <span className="mb-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-900 text-white">
                {entry.salida ? 'Merma / Salida' : 'Ajuste / Entrada'}
              </span>
              <span className="block truncate text-sm font-bold text-slate-800">
                {entry.producto}
              </span>
              <span className="block text-xs font-semibold text-slate-500">
                {formatDateTime(entry.fecha)}
              </span>
              <span className="block text-xs font-semibold text-slate-500">
                Motivo: {entry.motivo}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Movimiento
              </span>
              <span
                className={`text-lg font-black ${
                  entry.salida ? 'text-rose-600' : 'text-emerald-600'
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