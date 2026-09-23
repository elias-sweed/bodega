import { BarChart3 } from 'lucide-react'
import { formatMoney } from '../../utils/format'
import type { DiaVenta } from '../../hooks/useWeeklySales'

interface WeeklySalesChartProps {
  dias: DiaVenta[]
  loading: boolean
}

export function WeeklySalesChart({ dias, loading }: WeeklySalesChartProps) {
  const max = Math.max(1, ...dias.map((d) => d.total))
  const totalSemana = dias.reduce((sum, d) => sum + d.total, 0)
  const mejor = dias.reduce((a, b) => (b.total > a.total ? b : a), dias[0])

  return (
    <section className="fade-up rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
          <BarChart3 size={16} aria-hidden="true" className="text-ink" />
          Ventas de la semana
        </p>
        <p className="text-xs font-bold text-muted">
          Total: <span className="font-black text-gold">{formatMoney(totalSemana)}</span>
        </p>
      </div>

      {loading && dias.every((d) => d.total === 0) ? (
        <div className="mt-5 flex h-40 items-end gap-2.5">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="skeleton-shimmer w-full rounded-t-xl" style={{ height: `${40 + ((i * 37) % 80)}px` }} />
              <div className="skeleton-shimmer h-3 w-8 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 flex h-44 items-end gap-2 sm:gap-3">
            {dias.map((dia, i) => {
              const alto = Math.max(6, Math.round((dia.total / max) * 100))
              return (
                <div
                  key={dia.clave}
                  className="fade-up flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  style={{ animationDelay: `${i * 60}ms` }}
                  title={`${dia.etiqueta}: ${formatMoney(dia.total)}`}
                >
                  <span className="text-[10px] font-black tabular-nums text-muted">
                    {dia.total > 0 ? (dia.total >= 1000 ? `${(dia.total / 1000).toFixed(1)}k` : Math.round(dia.total)) : ''}
                  </span>
                  <div className="flex h-32 w-full items-end">
                    <div
                      className={`w-full rounded-t-xl transition-all duration-500 ${
                        dia.esHoy
                          ? 'border border-emerald-200/50 bg-emerald-400 shadow-sm'
                          : dia.total > 0
                            ? 'border border-gold/40 bg-gold/70'
                            : 'border border-line bg-surface-sub'
                      }`}
                      style={{ height: `${alto}%` }}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-black uppercase ${
                      dia.esHoy ? 'text-emerald-700' : 'text-muted'
                    }`}
                  >
                    {dia.esHoy ? 'Hoy' : dia.etiqueta}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-center text-xs font-semibold text-muted">
            {mejor && mejor.total > 0 ? (
              <>Mejor día: <span className="font-black capitalize text-ink">{mejor.esHoy ? 'hoy' : mejor.etiqueta}</span> con {formatMoney(mejor.total)}</>
            ) : (
              'Aún no hay ventas esta semana. Lo que vendas aparecerá aquí.'
            )}
          </p>
        </>
      )}
    </section>
  )
}
