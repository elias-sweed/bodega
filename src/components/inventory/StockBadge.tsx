import { TriangleAlert, CheckCircle2 } from 'lucide-react'

interface StockBadgeProps {
  stockActual: number
  stockMinimo: number
}

export function StockBadge({ stockActual, stockMinimo }: StockBadgeProps) {
  const lowStock = stockActual <= stockMinimo

  if (lowStock) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-200/30 bg-rose-400/20 px-2.5 py-1 text-xs font-black text-rose-100 backdrop-blur-xl">
        <TriangleAlert size={12} aria-hidden="true" />
        Stock bajo
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200/30 bg-emerald-400/20 px-2.5 py-1 text-xs font-black text-emerald-100 backdrop-blur-xl">
      <CheckCircle2 size={12} aria-hidden="true" />
      En stock
    </span>
  )
}
