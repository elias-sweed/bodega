import { useRef } from 'react'
import { Cart } from './Cart'
import type { CartItem } from '../../types'

interface PosSidebarProps {
  cart: CartItem[]
  charging: boolean
  highlightId: string | null
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
  onRemove: (productId: string) => void
  onCharge: () => void
  onSuspend: () => void
}

/**
 * Componente que renderiza el sidebar del carrito en la página de Caja.
 * Incluye un ref para scroll automático cuando se agrega el primer producto.
 */
export function PosSidebar({
  cart,
  charging,
  highlightId,
  onIncrease,
  onDecrease,
  onRemove,
  onCharge,
  onSuspend,
}: PosSidebarProps) {
  const cartSectionRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={cartSectionRef} className="min-h-0 scroll-mt-2">
      <Cart
        items={cart}
        charging={charging}
        highlightId={highlightId}
        onIncrease={onIncrease}
        onDecrease={onDecrease}
        onRemove={onRemove}
        onCharge={onCharge}
        onSuspend={onSuspend}
      />
    </div>
  )
}
