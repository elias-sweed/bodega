import { Banknote, Sparkles, TrendingUp } from 'lucide-react'
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
}

export function SalesTodayCard({ resumen }: SalesTodayCardProps) {
  const metodos = [
    { label: 'Efectivo', total: resumen.efectivo_hoy, icon: Banknote },
    { label: 'Yape', total: resumen.yape_hoy },
    { label: 'Plin', total: resumen.plin_hoy },
  ].filter((metodo) => metodo.total > 0)

  return (
    <section className="fade-up relative overflow-hidden rounded-[28px] border border-white/25 bg-gradient-to-br from-white/25 via-white/10 to-white/5 p-7 shadow-[0_24px_70px_-18px_rgba(20,5,80,0.7)] backdrop-blur-2xl sm:p-8">
      {/* brillos decorativos */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-indigo-400/30 blur-3xl"
      />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/90">
            <Sparkles size={13} aria-hidden="true" />
            Ventas de hoy
          </p>
          <p className="mt-3 text-5xl font-black tracking-tighter text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)] sm:text-6xl">
            {formatMoney(resumen.ventas_hoy_total)}
          </p>
          <p className="mt-2 text-sm font-semibold text-white/75">
            {resumen.ventas_hoy_count}{' '}
            {resumen.ventas_hoy_count === 1 ? 'venta registrada' : 'ventas registradas'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/25 bg-white/15 px-5 py-4 shadow-inner backdrop-blur-xl">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/70">
            <TrendingUp size={14} aria-hidden="true" />
            Ganancia estimada
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight text-white">
            {formatMoney(resumen.ganancia_estimada_hoy)}
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
