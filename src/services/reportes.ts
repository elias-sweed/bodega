import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'
import { supabase } from './supabase'

const CHUNK = 200

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export async function fetchVentasMes(
  desdeISO: string,
  hastaISO: string,
): Promise<VentasRow[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, total, fecha, metodo_pago, origen, ticket_externo, idempotency_key, creado_por')
    .gte('fecha', desdeISO)
    .lt('fecha', hastaISO)
    .order('fecha', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchDetalleVentasMes(
  ventaIds: string[],
): Promise<DetalleVentasRow[]> {
  const out: DetalleVentasRow[] = []
  for (const group of chunks(ventaIds, CHUNK)) {
    const { data, error } = await supabase
      .from('detalle_ventas')
      .select('id, venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario')
      .in('venta_id', group)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
  }
  return out
}

export async function fetchProductosReporte(
  productoIds: string[],
): Promise<Map<string, { nombre: string; costo: number }>> {
  const productos = new Map<string, { nombre: string; costo: number }>()
  for (const group of chunks(productoIds, CHUNK)) {
    const { data, error } = await supabase
      .from('productos')
      .select('id, nombre, costo')
      .in('id', group)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      productos.set(row.id, { nombre: row.nombre, costo: row.costo })
    }
  }
  return productos
}

export async function fetchCostosProductos(
  productoIds: string[],
): Promise<Map<string, number>> {
  const costos = new Map<string, number>()
  for (const group of chunks(productoIds, CHUNK)) {
    const { data, error } = await supabase
      .from('productos')
      .select('id, costo')
      .in('id', group)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) costos.set(row.id, row.costo)
  }
  return costos
}

export async function fetchIngresosMes(
  desdeISO: string,
  hastaISO: string,
): Promise<IngresosMercaderiaRow[]> {
  const { data, error } = await supabase
    .from('ingresos_mercaderia')
    .select(
      `id,
       compra_id,
       proveedor_id,
       nombre_proveedor,
       producto_id,
       cantidad_ingresada,
       costo_total,
       comprobante,
       motivo,
       fecha,
       created_at,
       creado_por`,
    )
    .gte('created_at', desdeISO)
    .lt('created_at', hastaISO)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}
