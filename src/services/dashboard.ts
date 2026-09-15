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
    throw new Error('No se pudo cargar el resumen del día. Verifica tus permisos.')
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