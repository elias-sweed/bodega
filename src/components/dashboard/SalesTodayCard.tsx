import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { formatMoney } from '../../utils/format'

interface SalesTodayCardProps {
  resumen: {
    ventas_hoy_total: number
    ventas_hoy_count: number
    efectivo_hoy: number
    yape_hoy: number
    plin_hoy: number
    ganancia_estimada_hoy: number
  }
  ayerTotal?: number
  etiqueta?: string
}

export function SalesTodayCard({ resumen, ayerTotal = 0, etiqueta = 'Ventas de hoy' }: SalesTodayCardProps) {
  const metodos = [
    { label: 'Efectivo', total: resumen.efectivo_hoy },
    { label: 'Yape', total: resumen.yape_hoy },
    { label: 'Plin', total: resumen.plin_hoy },
  ].filter((metodo) => metodo.total > 0)

  const comparativa =
    ayerTotal > 0
      ? Math.round(((resumen.ventas_hoy_total - ayerTotal) / ayerTotal) * 100)
      : null

  const cobrado = resumen.ventas_hoy_total
  const ganado = resumen.ganancia_estimada_hoy
  const maximo = Math.max(1, cobrado, ganado)

  return (
    <section className="fade-up relative shrink-0 overflow-hidden rounded-[28px] border border-line bg-surface p-7 shadow-sm backdrop-blur-2xl sm:p-8">
      <div className="relative flex flex-wrap items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink">
            <Sparkles size={13} aria-hidden="true" />
            {etiqueta}
          </p>
          <p className="mt-3 text-5xl font-black tracking-tighter text-gold  sm:text-6xl">
            {formatMoney(cobrado)}
          </p>
          <p className="mt-2 text-lg font-black tracking-tight tabular-nums text-profit">
            De eso, ganaste {formatMoney(ganado)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
            <span>
              {resumen.ventas_hoy_count}{' '}
              {resumen.ventas_hoy_count === 1 ? 'venta registrada' : 'ventas registradas'}
            </span>
            {comparativa !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-black tabular-nums ${
                  comparativa >= 0
                    ? 'border-profit/40 bg-profit/15 text-profit'
                    : 'border-rose-400/40 bg-rose-400/15 text-loss'
                }`}
                title={`Ayer: ${formatMoney(ayerTotal)}`}
              >
                {comparativa >= 0 ? (
                  <TrendingUp size={13} aria-hidden="true" />
                ) : (
                  <TrendingDown size={13} aria-hidden="true" />
                )}
                {comparativa >= 0 ? '+' : ''}{comparativa}% vs ayer
              </span>
            )}
          </p>
        </div>

        <div className="w-full shrink-0 rounded-2xl border border-line bg-surface px-6 py-5 backdrop-blur-xl sm:max-w-[18rem]">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
            Cobrado vs ganado
          </p>
          <div className="mt-3 flex h-36 items-end justify-center gap-5">
            <div className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className="text-sm font-black tabular-nums text-gold">
                {formatMoney(cobrado)}
              </span>
              <div
                className="w-14 rounded-t-xl border border-gold/40 bg-gold/70"
                style={{ height: `${Math.max(cobrado > 0 ? 10 : 4, Math.round((cobrado / maximo) * 100))}%` }}
              />
              <span className="flex items-center gap-1 text-xs font-bold text-muted">
                <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
                Cobrado
              </span>
            </div>
            <div className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className="text-sm font-black tabular-nums text-profit">
                {formatMoney(ganado)}
              </span>
              <div
                className="w-14 rounded-t-xl border border-emerald-200/50 bg-emerald-400 shadow-sm"
                style={{ height: `${Math.max(ganado > 0 ? 10 : 4, Math.round((ganado / maximo) * 100))}%` }}
              />
              <span className="flex items-center gap-1 text-xs font-bold text-muted">
                <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
                Ganado
              </span>
            </div>
          </div>
          <p className="mt-2.5 text-center text-xs font-medium text-muted">
            Lo verde es lo que te queda libre.
          </p>
        </div>
      </div>

      {metodos.length > 0 && (
        <div className="relative mt-6 flex flex-wrap gap-2.5">
          {metodos.map((metodo) => (
            <div
              key={metodo.label}
              className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2 backdrop-blur-xl transition-colors hover:bg-surface-3"
            >
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
                {metodo.label}
              </span>
              <span className="text-base font-black tracking-tight text-gold">
                {formatMoney(metodo.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
