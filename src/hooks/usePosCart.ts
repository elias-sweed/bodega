import { useCallback, useMemo, useState } from 'react'
import type { CartItem } from '../types'
import type { ProductosRow } from '../types/database.types'

/**
 * Hook que encapsula toda la lógica del carrito de venta en caja.
 * Maneja agregar, aumentar, disminuir y quitar productos del carrito.
 */
export function usePosCart() {
  const [cart, setCart] = useState<CartItem[]>([])

  const addProduct = useCallback((product: ProductosRow): void => {
    // Los servicios no tienen stock físico: siempre se pueden cobrar.
    if (product.tipo !== 'servicio' && product.stock_actual <= 0) return
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (existing) {
        if (product.tipo !== 'servicio' && existing.quantity >= product.stock_actual) {
          return current
        }
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...current, { product, quantity: 1 }]
    })
  }, [])

  const increaseQuantity = useCallback((productId: string): void => {
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) {
          return item
        }
        if (item.product.tipo !== 'servicio' && item.quantity >= item.product.stock_actual) {
          return item
        }
        return { ...item, quantity: item.quantity + 1 }
      }),
    )
  }, [])

  const decreaseQuantity = useCallback((productId: string): void => {
    setCart((current) =>
      current.flatMap((item) =>
        item.product.id === productId
          ? item.quantity > 1
            ? [{ ...item, quantity: item.quantity - 1 }]
            : []
          : [item],
      ),
    )
  }, [])

  const removeFromCart = useCallback((productId: string): void => {
    setCart((current) => current.filter((item) => item.product.id !== productId))
  }, [])

  const clearCart = useCallback((): void => {
    setCart([])
  }, [])

  const cartQtyById = useMemo(
    () => new Map(cart.map((item) => [item.product.id, item.quantity])),
    [cart],
  )

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  )

  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.precio_venta * item.quantity, 0),
    [cart],
  )

  return {
    cart,
    addProduct,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    cartQtyById,
    totalItems,
    totalPrice,
  }
}
