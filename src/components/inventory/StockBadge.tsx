import { TriangleAlert, CheckCircle2 } from 'lucide-react'

interface StockBadgeProps {
  stockActual: number
  stockMinimo: number
  tipo?: 'producto' | 'servicio'
}

export function StockBadge({ stockActual, stockMinimo, tipo }: StockBadgeProps) {
  // Un servicio no se agota: muestra su naturaleza, no un estado de stock.
  if (tipo === 'servicio') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-sky-200/30 bg-sky-400/15 px-2.5 py-1 text-xs font-black text-sky-300 backdrop-blur-xl">
        <CheckCircle2 size={12} aria-hidden="true" />
        Servicio
      </span>
    )
  }

  if (stockActual <= 0) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-200/30 bg-rose-400/20 px-2.5 py-1 text-xs font-black text-loss backdrop-blur-xl">
        <TriangleAlert size={12} aria-hidden="true" />
        Agotado
      </span>
    )
  }

  const lowStock = stockActual <= stockMinimo

  if (lowStock) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 text-xs font-black text-gold backdrop-blur-xl">
        <TriangleAlert size={12} aria-hidden="true" />
        Por agotar
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200/30 bg-emerald-400/20 px-2.5 py-1 text-xs font-black text-profit backdrop-blur-xl">
      <CheckCircle2 size={12} aria-hidden="true" />
      Disponible
    </span>
  )
}
