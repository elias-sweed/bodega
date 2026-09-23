import { Boxes } from 'lucide-react'

interface StockResumenCardProps {
  total: number
  bajos: number
  agotados: number
}

export function StockResumenCard({ total, bajos, agotados }: StockResumenCardProps) {
  return (
    <section className="fade-up rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-0.5">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink">
          <Boxes size={16} aria-hidden="true" />
        </span>
        Stock actual
      </p>
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4">
        <div>
          <p className="text-4xl font-black tracking-tighter text-ink">{total}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">
            Productos
          </p>
        </div>
        <div className="h-12 w-px self-center bg-surface-2" aria-hidden="true" />
        <div>
          <p className="text-4xl font-black tracking-tighter text-gold ">
            {bajos}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">
            Stock bajo
          </p>
        </div>
        <div className="h-12 w-px self-center bg-surface-2" aria-hidden="true" />
        <div>
          <p className="text-4xl font-black tracking-tighter text-loss ">
            {agotados}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">
            Agotados
          </p>
        </div>
      </div>
    </section>
  )
}
