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
      className={`h-full min-h-0 flex-col rounded-[28px] border border-line bg-surface shadow-[0_24px_70px_-20px_rgba(0,0,0,0.65)] backdrop-blur-2xl ${
        items.length === 0 ? 'hidden lg:flex' : 'flex'
      }`}
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-ink">
          <ShoppingCart size={19} aria-hidden="true" className="text-muted" />
          Carrito
        </h2>
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-black text-ink">
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
          <span className="text-3xl font-black tracking-tighter text-gold drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            {formatMoney(total)}
          </span>
        </div>

        <button
          type="button"
          disabled={!canCharge}
          onClick={onCharge}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-400/90 to-emerald-600/90 text-xl font-black tracking-[0.2em] text-ink shadow-[0_16px_40px_-14px_rgba(16,185,129,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-muted disabled:shadow-none disabled:hover:translate-y-0"
        >
          {charging ? 'COBRANDO…' : 'COBRAR'}
        </button>

        <button
          type="button"
          disabled={items.length === 0 || charging}
          onClick={onSuspend}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Pause size={15} aria-hidden="true" />
          Suspender venta
        </button>
      </footer>
    </aside>
  )
}
