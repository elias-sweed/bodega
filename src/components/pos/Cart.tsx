import type { CartItem } from '../../types'
import { formatMoney } from '../../utils/format'
import { CartItemRow } from './CartItemRow'

interface CartProps {
  items: CartItem[]
  charging: boolean
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
  onCharge: () => void
  onSuspend: () => void
}

export function Cart({
  items,
  charging,
  onIncrease,
  onDecrease,
  onCharge,
  onSuspend,
}: CartProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce(
    (sum, item) => sum + item.product.precio_venta * item.quantity,
    0,
  )

  return (
    <aside className="flex h-full min-h-0 flex-col rounded-3xl bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-xl font-bold text-slate-800">Carrito</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
          {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="text-4xl" aria-hidden="true">
            🛒
          </span>
          <p className="text-slate-400">
            El carrito está vacío.
            <br />
            Toca un producto para agregarlo.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-5">
          {items.map((item) => (
            <CartItemRow
              key={item.product.id}
              item={item}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
            />
          ))}
        </ul>
      )}

      <footer className="space-y-4 border-t border-slate-100 p-5">
        <div className="flex items-end justify-between gap-4">
          <span className="text-lg font-semibold text-slate-600">Total</span>
          <span className="text-4xl font-black tracking-tight text-slate-900">
            {formatMoney(total)}
          </span>
        </div>
        <button
          type="button"
          disabled={items.length === 0 || charging}
          onClick={onCharge}
          className="h-16 w-full rounded-2xl bg-emerald-500 text-2xl font-black tracking-widest text-white shadow-lg transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {charging ? 'PROCESANDO…' : 'COBRAR'}
        </button>
        <button
          type="button"
          disabled={items.length === 0 || charging}
          onClick={onSuspend}
          className="h-12 w-full rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
        >
          Suspender venta
        </button>
      </footer>
    </aside>
  )
}