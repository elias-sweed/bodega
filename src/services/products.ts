import type { ProductosInsert, ProductosRow } from '../types/database.types'
import { supabase } from './supabase'

export async function fetchProducts(): Promise<ProductosRow[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function insertProduct(
  product: ProductosInsert,
): Promise<ProductosRow> {
  const { data, error } = await supabase
    .from('productos')
    .insert(product)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}