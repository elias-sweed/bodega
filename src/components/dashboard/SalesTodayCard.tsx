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
    <section className="fade-up relative shrink-0 overflow-hidden rounded-[28px] border border-white/25 bg-gradient-to-br from-white/25 via-white/10 to-white/5 p-7 shadow-[0_24px_70px_-18px_rgba(20,5,80,0.7)] backdrop-blur-2xl sm:p-8">
      {/* brillos decorativos */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-indigo-400/30 blur-3xl"
      />

      <div className="relative flex flex-wrap items-center gap-6">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/90">
            <Sparkles size={13} aria-hidden="true" />
            {etiqueta}
          </p>
          <p className="mt-3 text-5xl font-black tracking-tighter text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-6xl">
            {formatMoney(cobrado)}
          </p>
          <p className="mt-2 text-lg font-black tracking-tight tabular-nums text-emerald-200">
            De eso, ganaste {formatMoney(ganado)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/75">
            <span>
              {resumen.ventas_hoy_count}{' '}
              {resumen.ventas_hoy_count === 1 ? 'venta registrada' : 'ventas registradas'}
            </span>
            {comparativa !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-black tabular-nums ${
                  comparativa >= 0
                    ? 'border-emerald-200/40 bg-emerald-400/20 text-emerald-100'
                    : 'border-rose-200/40 bg-rose-400/20 text-rose-100'
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

        <div className="w-full shrink-0 rounded-2xl border border-white/25 bg-white/10 px-6 py-5 backdrop-blur-xl sm:max-w-[18rem]">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
            Cobrado vs ganado
          </p>
          <div className="mt-3 flex h-36 items-end justify-center gap-5">
            <div className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className="text-sm font-black tabular-nums text-white">
                {formatMoney(cobrado)}
              </span>
              <div
                className="w-14 rounded-t-xl border border-white/30 bg-gradient-to-t from-white/25 to-white/55"
                style={{ height: `${Math.max(cobrado > 0 ? 10 : 4, Math.round((cobrado / maximo) * 100))}%` }}
              />
              <span className="flex items-center gap-1 text-xs font-bold text-white/70">
                <span className="h-2 w-2 rounded-full bg-white/60" aria-hidden="true" />
                Cobrado
              </span>
            </div>
            <div className="flex h-full flex-col items-center justify-end gap-1.5">
              <span className="text-sm font-black tabular-nums text-emerald-200">
                {formatMoney(ganado)}
              </span>
              <div
                className="w-14 rounded-t-xl border border-emerald-200/50 bg-gradient-to-t from-emerald-500/90 to-emerald-300 shadow-[0_0_20px_-4px_rgba(52,211,153,0.7)]"
                style={{ height: `${Math.max(ganado > 0 ? 10 : 4, Math.round((ganado / maximo) * 100))}%` }}
              />
              <span className="flex items-center gap-1 text-xs font-bold text-white/70">
                <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
                Ganado
              </span>
            </div>
          </div>
          <p className="mt-2.5 text-center text-xs font-medium text-white/50">
            Lo verde es lo que te queda libre.
          </p>
        </div>
      </div>

      {metodos.length > 0 && (
        <div className="relative mt-6 flex flex-wrap gap-2.5">
          {metodos.map((metodo) => (
            <div
              key={metodo.label}
              className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-xl transition-colors hover:bg-white/20"
            >
              <span className="text-xs font-extrabold uppercase tracking-widest text-white/70">
                {metodo.label}
              </span>
              <span className="text-base font-black tracking-tight text-white">
                {formatMoney(metodo.total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
