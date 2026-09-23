import type {
  DashboardResumenResult,
  ProductosRow,
} from '../types/database.types'
import { getFriendlyError } from '../utils/errors'
import { supabase } from './supabase'

export async function fetchDashboardResumen(): Promise<DashboardResumenResult> {
  const { data, error } = await supabase.rpc('dashboard_resumen')
  if (error) {
    throw new Error(getFriendlyError(error, 'No se pudo cargar el resumen del día.'))
  }
  if (!data) {
    // Sin actividad aún (primer día, bodega nueva): no es un error, es un
    // resumen en ceros para que la UI muestre un estado vacío amigable.
    return {
      ventas_hoy_total: 0,
      ventas_hoy_count: 0,
      efectivo_hoy: 0,
      yape_hoy: 0,
      plin_hoy: 0,
      gasto_compras_mes: 0,
      ganancia_estimada_hoy: 0,
      total_productos: 0,
      bajos_stock: 0,
      agotados: 0,
    }
  }
  return data
}

export async function fetchProductosBajoStock(): Promise<ProductosRow[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('stock_actual', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? [])
    .filter((producto) => producto.stock_actual <= producto.stock_minimo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export interface VentaDiaria {
  id: string
  fecha: string
  total: number
}

/** Totales de venta de los últimos 7 días (para el gráfico semanal) */
export async function fetchVentasUltimos7Dias(): Promise<VentaDiaria[]> {
  const desde = new Date()
  desde.setDate(desde.getDate() - 6)
  desde.setHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('ventas')
    .select('id, fecha, total')
    .gte('fecha', desde.toISOString())
    .lt('fecha', new Date().toISOString())
    .order('fecha', { ascending: true })

  if (error) {
    throw new Error('No se pudo cargar el gráfico semanal')
  }

  return (data ?? []).map((v) => ({
    id: String(v.id),
    fecha: String(v.fecha),
    total: Number(v.total) || 0,
  }))
}