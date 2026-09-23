import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, ChevronDown, RotateCcw, SearchX, ShoppingBag, TriangleAlert } from 'lucide-react'
import { useIngresosHistory } from '../../hooks/useHistory'
import { claveDia, claveHoy, formatFechaCorta, formatHora, formatMoney } from '../../utils/format'
import {
  esAjusteIngreso,
  groupByCompra,
  matchesCompraFilter,
  proveedorDeCompra,
} from './ingresos'
import { HistorySkeleton } from './HistorySkeleton'
import type { HistoryFilter } from './types'
import { describeFilter } from './types'

export function ComprasTab({ filter }: { filter: HistoryFilter }) {
  const navigate = useNavigate()
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

  const filteredCompras = useMemo(() => {
    const numeroByKey = new Map(compras.map((compra, i) => [compra.key, i + 1] as const))
    return compras
      .filter((compra) =>
        matchesCompraFilter(compra, proveedorMap, filter, numeroByKey.get(compra.key) ?? 0),
      )
      .map((compra) => ({ compra, numero: numeroByKey.get(compra.key) ?? 0 }))
  }, [compras, proveedorMap, filter])

  const totalComprado = useMemo(
    () => filteredCompras.reduce((sum, { compra }) => sum + compra.total, 0),
    [filteredCompras],
  )

  if (loading && ingresos.length === 0) {
    return <HistorySkeleton />
  }

  if (error && ingresos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-200/25 bg-rose-500/15 p-8 text-center shadow-sm backdrop-blur-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/25 text-rose-700">
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
      <div className="flex flex-col items-center gap-3 rounded-[28px] border border-line bg-surface p-12 text-center shadow-sm backdrop-blur-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
          <ShoppingBag size={26} aria-hidden="true" />
        </span>
        <p className="text-lg font-black tracking-tight text-ink">
          No hay compras registradas todavía.
        </p>
        <p className="text-sm font-medium text-muted">
          Las compras que registres en Compras aparecerán aquí.
        </p>
      </div>
    )
  }

  if (filteredCompras.length === 0) {
    const detalle = describeFilter(filter)
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] border border-line bg-surface p-12 text-center shadow-sm backdrop-blur-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
          <SearchX size={26} aria-hidden="true" />
        </span>
        <p className="text-lg font-black tracking-tight text-ink">
          {detalle
            ? `No hay compras ${detalle}.`
            : 'No hay compras que coincidan con el filtro.'}
        </p>
        <p className="text-sm font-medium text-muted">
          Prueba con otro día, horario o búsqueda.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 rounded-[28px] border border-line bg-surface px-5 py-4 shadow-sm backdrop-blur-2xl">
        <span className="text-sm font-bold text-muted">
          Total mercadería comprada
        </span>
        <span className="text-xl font-black tracking-tighter text-ink ">{formatMoney(totalComprado)}</span>
      </div>

      <ul className="flex flex-col gap-2">
        {filteredCompras.map(({ compra, numero }) => {
          const expanded = expandedKey === compra.key
          const proveedor = proveedorDeCompra(compra, proveedorMap)

          return (
            <li key={compra.key} className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-sm backdrop-blur-2xl">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpandedKey(expanded ? null : compra.key)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-all duration-300 hover:bg-surface"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="shrink-0 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-black tabular-nums text-ink">
                      N.º {numero}
                    </span>
                    <span className="truncate text-base font-extrabold tracking-tight text-ink">
                      {compra.items.slice(0, 2).map((item) => `${productoMap[item.producto_id ?? ''] ?? 'Producto eliminado'} × ${item.cantidad_ingresada}`).join(', ')}
                      {compra.items.length > 2 ? ` +${compra.items.length - 2} más` : ''}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-0.5 text-xs font-semibold text-muted">
                    <span className="tabular-nums">
                      {formatFechaCorta(compra.fecha)} · {formatHora(compra.fecha)}
                    </span>
                    <span className="truncate font-bold text-muted">{proveedor}</span>
                    {compra.comprobante && (
                      <span className="truncate font-mono text-muted">
                        Boleta {compra.comprobante}
                      </span>
                    )}
                  </span>
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xl font-black tracking-tighter text-ink">
                    {formatMoney(compra.total)}
                  </span>
                  <span
                    className={`text-muted transition-transform duration-300 ${
                      expanded ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  >
                    <ChevronDown size={18} />
                  </span>
                </span>
              </button>

              {expanded && (
                <div className="fade-in border-t border-line px-5 py-4">
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
                            <span className="min-w-0 flex-1 truncate font-medium text-ink">
                              {productoMap[item.producto_id ?? ''] ??
                                'Producto eliminado'}
                              <span className="text-muted">
                                {' '}
                                × {cantidad}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-bold text-muted">
                              c/u {formatMoney(costoUnitario)}
                            </span>
                            <span className="w-24 shrink-0 text-right font-bold text-ink">
                              {formatMoney(item.costo_total)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm backdrop-blur-xl">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-muted">Lo registró</span>
                        <span className="truncate font-bold text-ink">
                          {compra.items.find((item) => item.creado_por)?.creado_por ?? '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-muted">Total pagado</span>
                        <span className="text-base font-black tracking-tight tabular-nums text-ink">
                          {formatMoney(compra.total)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const clave = claveDia(compra.fecha)
                        // Si es hoy, al dashboard normal (sin vista de día)
                        navigate('/', {
                          state: clave === claveHoy() ? null : { fechaVista: clave },
                        })
                      }}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98]"
                    >
                      <BarChart3 size={16} aria-hidden="true" />
                      Ver resumen de este día
                    </button>
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
