import type {
  AjustesStockRow,
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

/** Detalle de muchas ventas en una sola pasada (por lotes para URLs largas) */
export async function fetchDetallesByVentas(
  ventaIds: string[],
): Promise<DetalleVentasRow[]> {
  if (ventaIds.length === 0) return []
  const all: DetalleVentasRow[] = []
  for (let i = 0; i < ventaIds.length; i += 200) {
    const chunk = ventaIds.slice(i, i + 200)
    const { data, error } = await supabase
      .from('detalle_ventas')
      .select('*')
      .in('venta_id', chunk)
    if (error) {
      throw new Error('No se pudo cargar el detalle de las ventas')
    }
    all.push(...(data ?? []))
  }
  return all
}

export async function fetchProductNames(
  ids: string[],
): Promise<Pick<ProductosRow, 'id' | 'nombre' | 'costo'>[]> {
  if (ids.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, costo')
    .in('id', ids)

  if (error) {
    throw new Error('No se pudieron cargar los productos')
  }

  return data
}

export async function fetchAjustesLegacy(): Promise<AjustesStockRow[]> {
  try {
    const { data, error } = await supabase
      .from('ajustes_stock')
      .select('*')
      .order('fecha', { ascending: false })

    if (error) {
      return []
    }

    return data ?? []
  } catch {
    return []
  }
}

export async function fetchIngresosHistory(): Promise<IngresosMercaderiaRow[]> {
  const { data, error } = await supabase
    .from('ingresos_mercaderia')
    .select(
      `id,
       producto_id,
       cantidad,
       cantidad_ingresada,
       motivo,
       fecha,
       costo_total,
       creado_por,
       productos ( nombre )`,
    )
    .order('fecha', { ascending: false })

  console.log('Ingresos cargados en Correcciones:', data)

  if (error) {
    throw new Error('No se pudo cargar el historial de compras')
  }

  return (data ?? []) as unknown as IngresosMercaderiaRow[]
}