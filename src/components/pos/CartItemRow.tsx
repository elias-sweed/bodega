import type { CartItem } from '../../types'
import { formatMoney } from '../../utils/format'

interface CartItemRowProps {
  item: CartItem
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
}

export function CartItemRow({ item, onIncrease, onDecrease }: CartItemRowProps) {
  const { product, quantity } = item
  const atMaxStock = quantity >= product.stock_actual

  return (
    <li className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-none">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-800">{product.nombre}</p>
        <p className="text-xs text-slate-500">
          {formatMoney(product.precio_venta)} c/u
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onDecrease(product.id)}
          className="h-10 w-10 rounded-xl bg-rose-100 text-xl font-black text-rose-700 transition-all hover:bg-rose-200 active:scale-95"
        >
          −
        </button>
        <span className="w-8 text-center text-lg font-bold text-slate-800">
          {quantity}
        </span>
        <button
          type="button"
          disabled={atMaxStock}
          onClick={() => onIncrease(product.id)}
          className="h-10 w-10 rounded-xl bg-emerald-100 text-xl font-black text-emerald-700 transition-all hover:bg-emerald-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300"
        >
          +
        </button>
      </div>

      <p className="w-20 text-right font-bold text-slate-800">
        {formatMoney(product.precio_venta * quantity)}
      </p>
    </li>
  )
}