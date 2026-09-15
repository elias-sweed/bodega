interface StockResumenCardProps {
  total: number
  bajos: number
  agotados: number
}

export function StockResumenCard({ total, bajos, agotados }: StockResumenCardProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">Stock actual</p>
      <div className="mt-2 flex flex-wrap gap-4">
        <div>
          <p className="text-4xl font-black tracking-tight text-slate-900">{total}</p>
          <p className="text-sm text-slate-400">Productos</p>
        </div>
        <div>
          <p className="text-4xl font-black tracking-tight text-amber-500">{bajos}</p>
          <p className="text-sm text-slate-400">Con stock bajo</p>
        </div>
        <div>
          <p className="text-4xl font-black tracking-tight text-rose-500">{agotados}</p>
          <p className="text-sm text-slate-400">Agotados</p>
        </div>
      </div>
    </section>
  )
}