import { useCallback, useState } from 'react'
import type { CartItem } from '../types'
import type { MetodoPago } from '../components/pos/metodosPago'
import type { ProductosRow } from '../types/database.types'

const SUSPENDED_SALE_KEY_PREFIX = 'pos_venta_suspendida_v2'

interface SuspendedSale {
  items: { id: string; cantidad: number }[]
  metodoPago: MetodoPago | null
  total: number
  count: number
}

function isLegacySuspendedSale(value: unknown): value is CartItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        'product' in item &&
        'quantity' in item,
    )
  )
}

function readSuspendedSale(key: string): SuspendedSale | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)

    if (isLegacySuspendedSale(parsed)) {
      return {
        items: parsed.map((item) => ({
          id: item.product.id,
          cantidad: item.quantity,
        })),
        metodoPago: null,
        total: parsed.reduce(
          (sum, item) => sum + item.product.precio_venta * item.quantity,
          0,
        ),
        count: parsed.reduce((sum, item) => sum + item.quantity, 0),
      }
    }

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'items' in parsed &&
      Array.isArray((parsed as SuspendedSale).items) &&
      (parsed as SuspendedSale).items.every(
        (item) =>
          item !== null &&
          typeof item === 'object' &&
          typeof (item as { id?: unknown }).id === 'string' &&
          typeof (item as { cantidad?: unknown }).cantidad === 'number',
      )
    ) {
      return parsed as SuspendedSale
    }

    return null
  } catch {
    return null
  }
}

function writeSuspendedSale(key: string, sale: SuspendedSale): void {
  window.localStorage.setItem(key, JSON.stringify(sale))
}

function clearSuspendedSale(key: string): void {
  window.localStorage.removeItem(key)
}

/**
 * Hook que maneja la lógica de venta suspendida en localStorage.
 * Permite suspender una venta y retomarla después.
 */
export function useSuspendedSale(userId: string | undefined) {
  const suspendedSaleKey = `${SUSPENDED_SALE_KEY_PREFIX}:${userId ?? 'anon'}`
  const [suspendedSale, setSuspendedSale] = useState<SuspendedSale | null>(() =>
    readSuspendedSale(suspendedSaleKey),
  )

  const handleSuspend = useCallback(
    (cart: CartItem[], metodoPago: MetodoPago | null): void => {
      const sale: SuspendedSale = {
        items: cart.map((item) => ({
          id: item.product.id,
          cantidad: item.quantity,
        })),
        metodoPago,
        total: cart.reduce(
          (sum, item) => sum + item.product.precio_venta * item.quantity,
          0,
        ),
        count: cart.reduce((sum, item) => sum + item.quantity, 0),
      }
      writeSuspendedSale(suspendedSaleKey, sale)
      setSuspendedSale(sale)
    },
    [suspendedSaleKey],
  )

  const handleResume = useCallback(
    (products: ProductosRow[]): { cart: CartItem[]; message: string } | null => {
      if (!suspendedSale) return null
      const productsById = new Map(products.map((product) => [product.id, product]))
      const cartRestored: CartItem[] = []
      let skipped = 0
      let clamped = 0
      for (const { id, cantidad } of suspendedSale.items) {
        const product = productsById.get(id)
        if (!product) {
          skipped += 1
          continue
        }
        const quantity = Math.min(cantidad, product.stock_actual)
        if (quantity <= 0) {
          skipped += 1
          continue
        }
        if (quantity < cantidad) {
          clamped += 1
        }
        cartRestored.push({ product, quantity })
      }
      clearSuspendedSale(suspendedSaleKey)
      setSuspendedSale(null)

      if (cartRestored.length === 0) {
        return null
      }

      const message =
        clamped > 0 || skipped > 0
          ? `Venta retomada con precios y stock actuales (${
              clamped > 0 ? 'se ajustó alguna cantidad' : 'se omitieron productos sin stock'
            })`
          : 'Venta retomada con precios actuales'

      return { cart: cartRestored, message }
    },
    [suspendedSale, suspendedSaleKey],
  )

  const handleDiscardSuspended = useCallback((): void => {
    clearSuspendedSale(suspendedSaleKey)
    setSuspendedSale(null)
  }, [suspendedSaleKey])

  return {
    suspendedSale,
    handleSuspend,
    handleResume,
    handleDiscardSuspended,
  }
}
