import { useMemo, useState } from 'react'
import { useIngresosHistory } from '../../hooks/useHistory'
import type { IngresosMercaderiaRow } from '../../types/database.types'
import { formatDateTime, formatMoney, shortId } from '../../utils/format'
import type { HistoryFilter } from './types'

interface CompraGroup {
  key: string
  proveedorId: string | null
  nombreProveedor: string | null
  comprobante: string | null
  fecha: string
  total: number
  items: IngresosMercaderiaRow[]
}

function proveedorDeCompra(
  compra: CompraGroup,
  proveedorMap: Record<string, string>,
): string {
  if (compra.nombreProveedor) return compra.nombreProveedor
  const delCatalogo = proveedorMap[compra.proveedorId ?? '']
  if (delCatalogo) return delCatalogo
  return compra.proveedorId === null
    ? 'Proveedor Varios / Sin Comprobante'
    : 'Proveedor eliminado'
}

function groupByCompra(ingresos: IngresosMercaderiaRow[]): CompraGroup[] {
  const groups = new Map<string, IngresosMercaderiaRow[]>()
  for (const ingreso of ingresos) {
    const key = ingreso.compra_id ?? ingreso.id
    const current = groups.get(key)
    if (current) {
      current.push(ingreso)
    } else {
      groups.set(key, [ingreso])
    }
  }

  const compras: CompraGroup[] = []
  for (const [key, items] of groups) {
    items.sort((a, b) => a.fecha.localeCompare(b.fecha))
    compras.push({
      key,
      proveedorId: items.find((item) => item.proveedor_id)?.proveedor_id ?? null,
      nombreProveedor:
        items.find((item) => item.nombre_proveedor)?.nombre_proveedor ?? null,
      comprobante: items.find((item) => item.comprobante)?.comprobante ?? null,
      fecha: items[0].fecha,
      total: items.reduce((sum, item) => sum + item.costo_total, 0),
      items,
    })
  }

  return compras.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

function matchesFilter(compra: CompraGroup, proveedorMap: Record<string, string>, filter: HistoryFilter): boolean {
  if (filter.from || filter.to) {
    const fecha = new Date(compra.fecha).getTime()
    if (filter.from && fecha < filter.from.getTime()) return false
    if (filter.to && fecha > filter.to.getTime()) return false
  }
  const query = filter.query.trim().toLowerCase()
  if (query === '') return true
  const proveedor = proveedorDeCompra(compra, proveedorMap)
  return (
    proveedor.toLowerCase().includes(query) ||
    (compra.comprobante ?? '').toLowerCase().includes(query) ||
    shortId(compra.key).includes(query)
  )
}

export function ComprasTab({ filter }: { filter: HistoryFilter }) {
  const { ingresos, proveedorMap, productoMap, loading, error, refresh } =
    useIngresosHistory()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const compras = useMemo(
    () => groupByCompra(ingresos),
    [ingresos],
  )

  const filteredCompras = useMemo(
    () => compras.filter((compra) => matchesFilter(compra, proveedorMap, filter)),
    [compras, proveedorMap, filter],
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
                    {compra.comprobante ? `#${compra.comprobante}` : `#${shortId(compra.key)}`}
                  </span>
                  <span className="text-slate-800">
                    {formatDateTime(compra.fecha)}
                  </span>
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
                          cantidad > 0 ? item.costo_total / cantidad : 0
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
                      <span className="text-slate-600">
                        Total pagado
                      </span>
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