import { useEffect, useRef } from 'react'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import type { CartItem } from '../../types'
import { formatMoney } from '../../utils/format'

interface CartItemRowProps {
  item: CartItem
  highlight?: boolean
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
  onRemove: (productId: string) => void
}

export function CartItemRow({ item, highlight = false, onIncrease, onDecrease, onRemove }: CartItemRowProps) {
  const { product, quantity } = item
  const atMaxStock = quantity >= product.stock_actual
  const rowRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (highlight) {
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [highlight, quantity])

  return (
    <li
      ref={rowRef}
      className={`flex items-center gap-3 rounded-xl border-b border-line py-3 last:border-none ${highlight ? 'row-flash border border-emerald-200/40 px-2' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold tracking-tight text-ink">
          {product.nombre}
        </p>
        <p className="text-xs font-medium text-muted">
          {formatMoney(product.precio_venta)} c/u
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onDecrease(product.id)}
          aria-label={`Quitar uno de ${product.nombre}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200/25 bg-rose-400/20 text-loss transition-all duration-200 hover:bg-rose-400/35 active:scale-90"
        >
          <Minus size={15} aria-hidden="true" />
        </button>
        <span key={quantity} className="animate-pop w-7 text-center text-base font-black tabular-nums text-ink">
          {quantity}
        </span>
        <button
          type="button"
          disabled={atMaxStock}
          onClick={() => onIncrease(product.id)}
          aria-label={`Agregar uno de ${product.nombre}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200/25 bg-emerald-400/20 text-profit transition-all duration-200 hover:bg-emerald-400/35 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
      </div>

      <p className="w-20 shrink-0 text-right text-sm font-black tracking-tight text-ink">
        {formatMoney(product.precio_venta * quantity)}
      </p>

      <button
        type="button"
        onClick={() => onRemove(product.id)}
        aria-label={`Eliminar ${product.nombre} del carrito (${quantity} ${quantity === 1 ? 'unidad' : 'unidades'})`}
        title={`Eliminar línea (${quantity} ${quantity === 1 ? 'unidad' : 'unidades'})`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-sub text-muted transition-all duration-200 hover:border-rose-200/40 hover:bg-rose-400/25 hover:text-loss active:scale-90"
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </li>
  )
}

export function CartEmptyState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
        <ShoppingCart size={24} aria-hidden="true" />
      </span>
      <p className="text-sm font-bold text-muted">
        El carrito está vacío.
        <br />
        <span className="font-medium text-muted">Toca un producto para agregarlo.</span>
      </p>
    </div>
  )
}
