import { Pause, ShoppingCart } from 'lucide-react'
import type { CartItem } from '../../types'
import { formatMoney } from '../../utils/format'
import { CartEmptyState, CartItemRow } from './CartItemRow'

interface CartProps {
  items: CartItem[]
  charging: boolean
  highlightId: string | null
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
  onRemove: (productId: string) => void
  onCharge: () => void
  onSuspend: () => void
}

export function Cart({
  items,
  charging,
  highlightId,
  onIncrease,
  onDecrease,
  onRemove,
  onSuspend,
  onCharge,
}: CartProps) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce(
    (sum, item) => sum + item.product.precio_venta * item.quantity,
    0,
  )

  const canCharge = items.length > 0 && !charging

  return (
    <aside
      className={`h-full min-h-0 flex-col rounded-[28px] border border-line bg-surface shadow-[0_28px_70px_-38_rgba(0,0,0,0.95)] ${
        items.length === 0 ? 'hidden lg:flex' : 'flex'
      }`}
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-ink">
          <ShoppingCart size={19} aria-hidden="true" className="text-amber-300" />
          Carrito
        </h2>
        <span className="rounded-full border border-amber-300/25 bg-surface-2 px-3 py-1 text-xs font-black text-ink">
          {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
        </span>
      </header>

      {items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <ul className="fade-in min-h-0 flex-1 overflow-y-auto px-5">
          {items.map((item) => (
            <CartItemRow
              key={item.product.id}
              item={item}
              highlight={highlightId === item.product.id}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}

      <footer className="shrink-0 space-y-3 border-t border-line p-5 pt-4">
        <div className="flex items-end justify-between gap-4">
          <span className="text-sm font-bold uppercase tracking-widest text-muted">
            Total
          </span>
          <span className="text-3xl font-black tracking-tighter text-gold">
            {formatMoney(total)}
          </span>
        </div>

        <button
          type="button"
          disabled={!canCharge}
          onClick={onCharge}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 text-xl font-black tracking-[0.2em] text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
        >
          {charging ? 'COBRANDO…' : 'COBRAR'}
        </button>

        <button
          type="button"
          disabled={items.length === 0 || charging}
          onClick={onSuspend}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 text-sm font-extrabold text-ink transition-colors hover:bg-surface-3 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Pause size={15} aria-hidden="true" />
          Suspender venta
        </button>
      </footer>
    </aside>
  )
}
