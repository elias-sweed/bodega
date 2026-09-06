interface StockBadgeProps {
  stockActual: number
  stockMinimo: number
}

export function StockBadge({ stockActual, stockMinimo }: StockBadgeProps) {
  const lowStock = stockActual <= stockMinimo

  if (lowStock) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
        ⚠ Stock bajo
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
      ✓ En stock
    </span>
  )
}