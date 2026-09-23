import { useEffect, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  History,
  RotateCcw,
  Wrench,
  X,
} from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'
import { formatDateTime, formatMoney, toTitleCase } from '../../utils/format'
import { fetchKardex, type KardexResult } from '../../services/kardex'

interface KardexModalProps {
  product: ProductosRow
  onClose: () => void
}

const TIPO_STYLE = {
  venta: {
    wrap: 'border-rose-200/30 bg-rose-400/20 text-rose-700',
    Icon: ArrowDownLeft,
    label: 'Salida',
  },
  compra: {
    wrap: 'border-emerald-200/30 bg-emerald-400/20 text-emerald-700',
    Icon: ArrowUpRight,
    label: 'Entrada',
  },
  ajuste: {
    wrap: 'border-amber-200/30 bg-amber-400/20 text-amber-700',
    Icon: Wrench,
    label: 'Ajuste',
  },
} as const

export function KardexModal({ product, onClose }: KardexModalProps) {
  const [data, setData] = useState<KardexResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    void fetchKardex(product.id).then(
      (result) => {
        if (!cancelled) setData(result)
      },
      (cause) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el kardex')
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [product.id, reloadToken])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Movimientos de ${product.nombre}`}
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#0b0420]/85 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="fade-up flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-line bg-surface shadow-sm backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3 p-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2 text-ink">
              <History size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                Movimientos
              </p>
              <h2 className="truncate text-lg font-black tracking-tighter text-ink">
                {toTitleCase(product.nombre)}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-200 hover:bg-surface-3 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {data && (
          <div className="grid shrink-0 grid-cols-3 gap-2 px-6 pb-4">
            {[
              { label: 'Entradas', value: data.totalEntradas, tone: 'text-emerald-700' },
              { label: 'Salidas', value: data.totalSalidas, tone: 'text-rose-700' },
              { label: 'Stock actual', value: product.stock_actual, tone: 'text-ink' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-line bg-surface px-3 py-2.5 text-center backdrop-blur-xl"
              >
                <p className={`text-2xl font-black tabular-nums ${stat.tone}`}>
                  {stat.value}
                </p>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {error ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200/25 bg-rose-400/10 p-8 text-center">
              <p className="text-sm font-extrabold text-ink">{error}</p>
              <button
                type="button"
                onClick={() => setReloadToken((t) => t + 1)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-rose-700 shadow transition-transform hover:-translate-y-0.5"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : !data ? (
            <div className="flex flex-col gap-2.5" aria-label="Cargando kardex" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5"
                >
                  <div className="skeleton-shimmer h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="skeleton-shimmer h-4 w-2/3 rounded-full" />
                    <div className="skeleton-shimmer mt-2 h-3 w-1/3 rounded-full opacity-70" />
                  </div>
                  <div className="skeleton-shimmer h-6 w-14 shrink-0 rounded-full" />
                </div>
              ))}
            </div>
          ) : data.movements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface-sub px-5 py-10 text-center">
              <p className="text-sm font-extrabold text-ink">Sin movimientos</p>
              <p className="mt-1 text-xs font-medium text-muted">
                Este producto aún no tiene ventas, compras ni ajustes.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.movements.map((m) => {
                const style = TIPO_STYLE[m.tipo]
                const { Icon } = style
                const entrada = m.cantidad > 0
                return (
                  <li
                    key={m.id}
                    className="fade-in flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 backdrop-blur-xl"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.wrap}`}
                    >
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold tracking-tight text-ink">
                        {m.titulo}
                      </p>
                      <p className="truncate text-xs font-medium text-muted">
                        {formatDateTime(m.fecha)}
                        {m.detalle ? ` · ${m.detalle}` : ''}
                        {m.autor ? ` · por ${m.autor}` : ''}
                        {m.monto !== null && m.monto > 0
                          ? ` · ${formatMoney(m.monto)}`
                          : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black tabular-nums ${
                        entrada
                          ? 'border-emerald-200/30 bg-emerald-400/20 text-emerald-700'
                          : 'border-rose-200/30 bg-rose-400/20 text-rose-700'
                      }`}
                    >
                      {entrada ? `+${m.cantidad}` : m.cantidad}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          {data && data.movements.length > 0 && (
            <p className="mt-3 text-center text-[11px] font-semibold text-muted">
              {data.movements.length} movimientos · {TIPO_STYLE.venta.label} por ventas,{' '}
              {TIPO_STYLE.compra.label} por compras, {TIPO_STYLE.ajuste.label} manuales
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
