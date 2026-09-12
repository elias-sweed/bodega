import type { CartItem } from '../types'
import type { RegistrarVentaResult } from '../types/database.types'
import { supabase } from './supabase'

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
    throw new Error(error.message)
  }

  return data
}