import type { ProductosRow } from '../types/database.types'
import { supabase } from './supabase'

function todayRange(): { start: string; end: string } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export async function fetchVentasDeHoy(): Promise<number> {
  const { start, end } = todayRange()

  const { data, error } = await supabase
    .from('ventas')
    .select('total')
    .gte('fecha', start)
    .lt('fecha', end)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).reduce((sum, row) => sum + row.total, 0)
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