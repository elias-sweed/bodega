import type {
  ProductosInsert,
  ProductosRow,
  ProductosUpdate,
} from '../types/database.types'
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

export async function updateProduct(
  id: string,
  updates: ProductosUpdate,
): Promise<ProductosRow> {
  const { data, error } = await supabase
    .from('productos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}