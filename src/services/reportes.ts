import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'
import { supabase } from './supabase'

const CHUNK = 200

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

export async function fetchVentasMes(
  desdeISO: string,
  hastaISO: string,
): Promise<VentasRow[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('id, total, fecha, metodo_pago, origen, ticket_externo, creado_por')
    .gte('fecha', desdeISO)
    .lt('fecha', hastaISO)
    .order('fecha', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

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

    if (error) {
      throw new Error(error.message)
    }

    out.push(...(data ?? []))
  }
  return out
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

    if (error) {
      throw new Error(error.message)
    }

    for (const row of data ?? []) {
      costos.set(row.id, row.costo)
    }
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
       producto_id,
       cantidad,
       cantidad_ingresada,
       motivo,
       costo_unitario,
       costo_total,
       fecha,
       creado_por`,
    )
    .gte('fecha', desdeISO)
    .lt('fecha', hastaISO)
    .order('fecha', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as IngresosMercaderiaRow[]
}