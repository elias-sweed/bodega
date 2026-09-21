import { ShoppingBag } from 'lucide-react'
import { formatMoney } from '../../utils/format'

interface GastoMesCardProps {
  total: number
}

export function GastoMesCard({ total }: GastoMesCardProps) {
  return (
    <section className="fade-up rounded-[28px] border border-white/20 bg-white/10 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-0.5">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-white">
          <ShoppingBag size={16} aria-hidden="true" />
        </span>
        Compras del mes
      </p>
      <p className="mt-4 text-4xl font-black tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
        {formatMoney(total)}
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-white/65">
        Lo invertido en recibir mercadería este mes.
      </p>
    </section>
  )
}
