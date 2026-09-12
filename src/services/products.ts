import type {
  ProductosInsert,
  ProductosRow,
  ProductosUpdate,
  RegistrarAjusteManualResult,
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
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('No se pudo crear el producto. Verifica tus permisos e inténtalo de nuevo.')
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
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(
      'No se pudo actualizar el producto: no existe o tu cuenta no tiene permisos de edición (solo admin).',
    )
  }

  return data
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function ajustarStock(
  id: string,
  nuevoStock: number,
  esRegalo = false,
  motivo = 'Corrección de inventario',
): Promise<RegistrarAjusteManualResult> {
  const stock = Math.max(0, Math.round(nuevoStock))

  const { data, error } = await supabase.rpc('registrar_ajuste_manual', {
    p_producto_id: id,
    p_nuevo_stock: stock,
    p_es_regalo: esRegalo,
    p_motivo: motivo,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error(
      'No se pudo ajustar el stock: el producto no existe o tu cuenta no tiene permisos (solo admin).',
    )
  }

  return data
}