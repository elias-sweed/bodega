import { useMemo, useState } from 'react'
import { useIngresosHistory } from '../../hooks/useHistory'
import { formatDateTime, formatMoney, shortId } from '../../utils/format'
import {
  esAjusteIngreso,
  groupByCompra,
  matchesCompraFilter,
  proveedorDeCompra,
} from './ingresos'
import type { HistoryFilter } from './types'

export function ComprasTab({ filter }: { filter: HistoryFilter }) {
  const { ingresos, proveedorMap, productoMap, loading, error, refresh } =
    useIngresosHistory()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const compras = useMemo(
    () =>
      groupByCompra(
        ingresos.filter((ingreso) => !esAjusteIngreso(ingreso)),
      ),
    [ingresos],
  )

  const filteredCompras = useMemo(
    () => compras.filter((compra) => matchesCompraFilter(compra, proveedorMap, filter)),
    [compras, proveedorMap, filter],
  )

  const totalComprado = useMemo(
    () => filteredCompras.reduce((sum, compra) => sum + compra.total, 0),
    [filteredCompras],
  )

  if (loading) {
    return <p className="py-10 text-center text-lg text-slate-400">Cargando compras…</p>
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
          No hay compras registradas todavía.
        </p>
      </div>
    )
  }

  if (filteredCompras.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-500">
          No hay compras que coincidan con el filtro.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900 px-5 py-4 text-white">
        <span className="text-sm font-semibold text-slate-300">
          Total mercadería comprada
        </span>
        <span className="text-lg font-black">{formatMoney(totalComprado)}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {filteredCompras.map((compra) => {
          const expanded = expandedKey === compra.key
          const proveedor = proveedorDeCompra(compra, proveedorMap)

          return (
            <li key={compra.key} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpandedKey(expanded ? null : compra.key)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-400">
                    {compra.comprobante
                      ? `#${compra.comprobante}`
                      : `#${shortId(compra.key)}`}
                  </span>
                  <span className="text-slate-800">{formatDateTime(compra.fecha)}</span>
                  <span className="truncate text-sm font-semibold text-slate-600">
                    {proveedor}
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-lg font-bold text-slate-900">
                    {formatMoney(compra.total)}
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
                  <div className="flex flex-col gap-2">
                    <ul className="flex flex-col gap-2">
                      {compra.items.map((item) => {
                        const cantidad = item.cantidad_ingresada
                        const costoUnitario =
                          cantidad !== 0 ? item.costo_total / cantidad : 0
                        return (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-4 text-sm"
                          >
                            <span className="min-w-0 flex-1 truncate text-slate-700">
                              {productoMap[item.producto_id ?? ''] ??
                                'Producto eliminado'}
                              <span className="text-slate-400">
                                {' '}
                                × {cantidad}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-slate-500">
                              c/u {formatMoney(costoUnitario)}
                            </span>
                            <span className="w-24 shrink-0 text-right font-semibold text-slate-800">
                              {formatMoney(item.costo_total)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <span className="text-slate-600">Total pagado</span>
                      <span className="text-base font-black text-slate-900">
                        {formatMoney(compra.total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}