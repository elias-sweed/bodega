import type {
  ProductosInsert,
  ProductosRow,
  ProductosUpdate,
  RegistrarAjusteStockArgs,
  RegistrarAjusteStockResult,
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

export async function fetchProductCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('categoria')
    .order('categoria', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const unique = new Set<string>()
  for (const row of data ?? []) {
    const name = row.categoria.trim()
    if (name) unique.add(name)
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es'))
}

export async function fetchProductByName(
  name: string,
  excludeId?: string,
): Promise<{ id: string; nombre: string } | null> {
  let query = supabase
    .from('productos')
    .select('id, nombre')
    .ilike('nombre', name)
    .limit(1)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query.maybeSingle()

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

export async function registrarAjusteStock(
  input: RegistrarAjusteStockArgs,
): Promise<RegistrarAjusteStockResult> {
  const { data, error } = await supabase.rpc('registrar_ajuste_stock', input)

  if (error) {
    throw new Error(error.message)
  }

  return data
}