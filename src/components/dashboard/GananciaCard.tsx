import { TrendingUp } from 'lucide-react'
import { formatMoney } from '../../utils/format'

interface GananciaCardProps {
  ganancia: number
  totalVendido: number
}

export function GananciaCard({ ganancia, totalVendido }: GananciaCardProps) {
  return (
    <section className="fade-up flex h-full flex-col justify-center rounded-[28px] border border-emerald-200/25 bg-gradient-to-br from-emerald-400/20 via-white/10 to-white/5 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
        <TrendingUp size={16} aria-hidden="true" className="text-emerald-200" />
        Lo que te queda hoy
      </p>
      <p className="mt-3 text-4xl font-black tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-5xl">
        {formatMoney(ganancia)}
      </p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-white/65">
        Cobraste {formatMoney(totalVendido)} y, quitando lo que te costó cada
        producto, te quedan {formatMoney(ganancia)} libres.
      </p>
      <p className="mt-1 text-xs font-medium text-white/45">
        Es un aproximado: usa el costo guardado de cada producto.
      </p>
    </section>
  )
}
