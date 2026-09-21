import { Boxes } from 'lucide-react'

interface StockResumenCardProps {
  total: number
  bajos: number
  agotados: number
}

export function StockResumenCard({ total, bajos, agotados }: StockResumenCardProps) {
  return (
    <section className="fade-up rounded-[28px] border border-white/20 bg-white/10 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-0.5">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-white">
          <Boxes size={16} aria-hidden="true" />
        </span>
        Stock actual
      </p>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <p className="text-4xl font-black tracking-tighter text-white">{total}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/60">
            Productos
          </p>
        </div>
        <div className="h-12 w-px self-center bg-white/15" aria-hidden="true" />
        <div>
          <p className="text-4xl font-black tracking-tighter text-amber-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
            {bajos}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/60">
            Stock bajo
          </p>
        </div>
        <div className="h-12 w-px self-center bg-white/15" aria-hidden="true" />
        <div>
          <p className="text-4xl font-black tracking-tighter text-rose-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
            {agotados}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/60">
            Agotados
          </p>
        </div>
      </div>
    </section>
  )
}
