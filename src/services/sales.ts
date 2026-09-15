import type { CartItem } from '../types'
import type { RegistrarVentaResult } from '../types/database.types'
import { getFriendlyError } from '../utils/errors'
import { supabase } from './supabase'

/**
 * Error de venta. Cuando hay problemas de stock, `stockShortIds` trae los ids
 * de los productos que no alcanzaron, para que el carrito NO se pierda y la UI
 * pueda avisar cuáles revisar.
 */
export class VentaError extends Error {
  stockShortIds: string[]

  constructor(message: string, stockShortIds: string[] = []) {
    super(message)
    this.name = 'VentaError'
    this.stockShortIds = stockShortIds
  }
}

function isVentaError(value: unknown): value is VentaError {
  return value instanceof VentaError
}

export function getStockShortIds(cause: unknown): string[] {
  return isVentaError(cause) ? cause.stockShortIds : []
}

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export async function registrarVenta(
  items: CartItem[],
  metodoPago: string,
): Promise<RegistrarVentaResult> {
  const articulos = items.map((item) => ({
    producto_id: item.product.id,
    cantidad: item.quantity,
    precio_unitario: item.product.precio_venta,
  }))

  const { data, error } = await supabase.rpc('registrar_venta', {
    p_articulos: articulos,
    p_metodo_pago: metodoPago,
  })

  if (error) {
    const raw = error.message
    if (raw.toLowerCase().includes('stock insuficiente')) {
      const idMatch = raw.match(UUID_RE)
      const ids = idMatch ? [idMatch[0]] : []
      throw new VentaError(getFriendlyError(error), ids)
    }
    throw new VentaError(getFriendlyError(error, 'No se pudo registrar la venta.'))
  }

  return data
}