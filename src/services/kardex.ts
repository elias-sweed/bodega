import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'
import { supabase } from './supabase'

export interface KardexMovement {
  id: string
  fecha: string
  tipo: 'venta' | 'compra' | 'ajuste'
  titulo: string
  detalle: string | null
  /** Positivo = entrada, negativo = salida */
  cantidad: number
  monto: number | null
  autor: string | null
}

export interface KardexResult {
  movements: KardexMovement[]
  totalEntradas: number
  totalSalidas: number
}

const AJUSTE_NOMBRE = 'Ajuste Manual de Inventario'

export async function fetchKardex(productoId: string): Promise<KardexResult> {
  const [{ data: detalle, error: detalleError }, { data: ingresos, error: ingresosError }] =
    await Promise.all([
      supabase.from('detalle_ventas').select('*').eq('producto_id', productoId),
      supabase
        .from('ingresos_mercaderia')
        .select('*')
        .eq('producto_id', productoId)
        .order('fecha', { ascending: false }),
    ])

  if (detalleError) {
    throw new Error('No se pudo cargar el historial de ventas del producto')
  }
  if (ingresosError) {
    throw new Error('No se pudo cargar el historial de ingresos del producto')
  }

  const detalleRows = (detalle ?? []) as DetalleVentasRow[]
  const ingresoRows = (ingresos ?? []) as IngresosMercaderiaRow[]

  const ventaIds = [...new Set(detalleRows.map((d) => d.venta_id))]
  let ventasById = new Map<string, VentasRow>()
  if (ventaIds.length > 0) {
    const { data: ventas, error: ventasError } = await supabase
      .from('ventas')
      .select('*')
      .in('id', ventaIds)
    if (ventasError) {
      throw new Error('No se pudo cargar el historial de ventas del producto')
    }
    ventasById = new Map(((ventas ?? []) as VentasRow[]).map((v) => [v.id, v]))
  }

  const movements: KardexMovement[] = []

  for (const d of detalleRows) {
    const venta = ventasById.get(d.venta_id)
    movements.push({
      id: `venta-${d.id}`,
      fecha: venta?.fecha ?? new Date(0).toISOString(),
      tipo: 'venta',
      titulo: `Venta · ${venta?.metodo_pago ?? '—'}`,
      detalle: null,
      cantidad: -d.cantidad,
      monto: d.subtotal,
      autor: venta?.creado_por ?? null,
    })
  }

  for (const ing of ingresoRows) {
    const esAjuste = (ing.nombre_proveedor ?? '') === AJUSTE_NOMBRE
    movements.push({
      id: `ingreso-${ing.id}`,
      fecha: ing.fecha,
      tipo: esAjuste ? 'ajuste' : 'compra',
      titulo: esAjuste
        ? (ing.motivo?.trim() || 'Ajuste manual')
        : (ing.nombre_proveedor?.trim() ||
            (ing.comprobante ? `Compra ${ing.comprobante}` : 'Compra')),
      detalle: esAjuste ? null : (ing.comprobante?.trim() || null),
      cantidad: ing.cantidad_ingresada,
      monto: Math.abs(ing.costo_total),
      autor: ing.creado_por ?? null,
    })
  }

  movements.sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha))

  return {
    movements,
    totalEntradas: movements
      .filter((m) => m.cantidad > 0)
      .reduce((sum, m) => sum + m.cantidad, 0),
    totalSalidas: movements
      .filter((m) => m.cantidad < 0)
      .reduce((sum, m) => sum + Math.abs(m.cantidad), 0),
  }
}
