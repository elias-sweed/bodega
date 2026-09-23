import { Minus, Plus } from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'

interface ProductButtonProps {
  product: ProductosRow
  qtyInCart?: number
  highlight?: boolean
  onAdd: () => void
  onIncrease?: () => void
  onDecrease?: () => void
}

function stockLevel(stockActual: number, stockMinimo: number): number {
  const reference = Math.max(stockMinimo * 2, 10)
  return Math.min(stockActual / reference, 1)
}

function stockStyle(stockActual: number, stockMinimo: number): string {
  if (stockActual <= 0) return 'bg-rose-400'
  if (stockActual <= stockMinimo) return 'bg-amber-300'
  return 'bg-emerald-300'
}

export function ProductButton({
  product,
  qtyInCart = 0,
  highlight = false,
  onAdd,
  onIncrease,
  onDecrease,
}: ProductButtonProps) {
  const agotado = product.stock_actual <= 0
  const atMax = qtyInCart >= product.stock_actual
  const width = Math.round(stockLevel(product.stock_actual, product.stock_minimo) * 100)

  return (
    <div
      className={`relative flex min-h-32 flex-col rounded-[22px] border bg-surface shadow-sm backdrop-blur-2xl transition-all duration-300 ${
        highlight
          ? 'border-emerald-200/60 bg-surface-3 shadow-sm'
          : 'border-line'
      } ${agotado ? 'opacity-50' : ''}`}
    >
      {/* Contador visible: cuántos llevas en el carrito */}
      {qtyInCart > 0 && (
        <span
          key={qtyInCart}
          className="animate-pop absolute -right-2 -top-2 z-10 flex h-8 min-w-8 items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-500 px-2 text-sm font-black tabular-nums text-white shadow-sm"
          aria-label={`${qtyInCart} en el carrito`}
        >
          ×{qtyInCart}
        </span>
      )}

      {/* "+1" flotante en cada toque: confirma que el tap contó */}
      {qtyInCart > 0 && (
        <span
          key={`plus-${qtyInCart}`}
          aria-hidden="true"
          className="float-plus pointer-events-none absolute right-3 top-7 z-10 text-lg font-black text-emerald-700"
        >
          +1
        </span>
      )}

      <button
        type="button"
        disabled={agotado}
        onClick={onAdd}
        aria-label={`Agregar ${product.nombre} al carrito${qtyInCart > 0 ? ` (llevas ${qtyInCart})` : ''}`}
        className={`flex flex-1 flex-col items-start justify-center gap-1.5 rounded-t-[22px] px-5 pb-2 pt-4 text-left transition-all duration-300 active:scale-[0.98] ${
          agotado ? 'cursor-not-allowed' : 'hover:bg-surface'
        }`}
      >
        <span className="line-clamp-2 text-base font-extrabold leading-tight tracking-tight text-ink">
          {product.nombre}
        </span>
        <span className="text-xl font-black tracking-tight text-ink">
          {formatMoney(product.precio_venta)}
        </span>

        <div
          className="flex w-full items-center gap-2"
          title={`Quedan ${product.stock_actual} unidades`}
        >
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                agotado ? 'w-0' : stockStyle(product.stock_actual, product.stock_minimo)
              }`}
              style={{ width: `${agotado ? 0 : width}%` }}
            />
          </div>
          <span
            className={`shrink-0 text-xs font-black tabular-nums ${
              agotado
                ? 'text-rose-700'
                : product.stock_actual <= product.stock_minimo
                  ? 'text-amber-700'
                  : 'text-emerald-700'
            }`}
          >
            {agotado ? 'Agotado' : `${product.stock_actual}`}
          </span>
        </div>
      </button>

      {/* Corrección inmediata: restar/sumar sin ir al carrito ni al cobro */}
      {qtyInCart > 0 && !agotado && (
        <div className="flex items-center justify-between gap-2 rounded-b-[22px] border-t border-line bg-surface-sub px-3 py-1.5">
          <button
            type="button"
            onClick={onDecrease}
            aria-label={`Quitar uno de ${product.nombre} (llevas ${qtyInCart})`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-100 text-rose-700 transition-all duration-200 hover:bg-rose-200/60 active:scale-90"
          >
            <Minus size={14} aria-hidden="true" />
          </button>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            {qtyInCart} en carrito
          </span>
          <button
            type="button"
            onClick={onIncrease}
            disabled={atMax}
            aria-label={`Agregar otro ${product.nombre}`}
            title={atMax ? 'Llegaste al stock disponible' : `Agregar otro ${product.nombre}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-100 text-emerald-700 transition-all duration-200 hover:bg-emerald-200/60 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
