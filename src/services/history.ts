import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  ProductosRow,
  VentasRow,
} from '../types/database.types'
import { supabase } from './supabase'

export async function fetchVentasHistory(): Promise<VentasRow[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .order('fecha', { ascending: false })

  if (error) {
    throw new Error('No se pudo cargar el historial de ventas')
  }

  return data
}

export async function fetchDetalleVenta(
  ventaId: string,
): Promise<DetalleVentasRow[]> {
  const { data, error } = await supabase
    .from('detalle_ventas')
    .select('*')
    .eq('venta_id', ventaId)

  if (error) {
    throw new Error('No se pudo cargar el detalle de la venta')
  }

  return data
}

export async function fetchProductNames(
  ids: string[],
): Promise<Pick<ProductosRow, 'id' | 'nombre'>[]> {
  if (ids.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre')
    .in('id', ids)

  if (error) {
    throw new Error('No se pudieron cargar los productos')
  }

  return data
}

export async function fetchIngresosHistory(): Promise<IngresosMercaderiaRow[]> {
  const { data, error } = await supabase
    .from('ingresos_mercaderia')
    .select('*')
    .order('fecha', { ascending: false })

  if (error) {
    throw new Error('No se pudo cargar el historial de compras')
  }

  return data
}