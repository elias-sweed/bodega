import type {
  ActualizarProductoResult,
  ProductosInsert,
  ProductosRow,
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

export async function actualizarProducto(input: {
  p_id: string
  p_nombre: string
  p_categoria: string
  p_codigo_barras: string | null
  p_precio_venta: number
  p_costo: number
  p_stock_minimo: number
  p_nuevo_stock: number | null
  p_motivo: string
}): Promise<ActualizarProductoResult> {
  const { data, error } = await supabase.rpc('actualizar_producto', input)
  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error(
      'No se pudo guardar el producto: el producto no existe o tu cuenta no tiene permisos (solo administrador).',
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
  creadoPor?: string | null,
): Promise<RegistrarAjusteManualResult> {
  const stock = Math.max(0, Math.round(nuevoStock))

  let userId: string | null = creadoPor ?? null
  if (!userId) {
    try {
      const { data: sesion } = await supabase.auth.getUser()
      userId = sesion.user?.id ?? null
    } catch {
      userId = null
    }
  }

  const { data: producto } = await supabase
    .from('productos')
    .select('stock_actual, costo')
    .eq('id', id)
    .single()
  const stockActual = producto?.stock_actual ?? null
  const costo = producto?.costo ?? 0

  const { data: fila, error: updateError } = await supabase
    .from('productos')
    .update({ stock_actual: stock })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !fila) {
    console.error('ajustarStock: falló el UPDATE de stock_actual', {
      updateError,
      id,
      stock,
    })
    throw new Error(
      updateError?.message ??
        'No se pudo ajustar el stock: el producto no existe o tu cuenta no tiene permisos (solo admin).',
    )
  }

  const diferencia = stockActual === null ? 0 : stock - stockActual
  const esSinCosto =
    esRegalo ||
    motivo.toLowerCase().includes('regalo') ||
    motivo.toLowerCase().includes('bonificación')
  const costoUnit = esSinCosto ? 0 : costo || 0

  if (diferencia !== 0) {
    const { data, error } = await supabase
      .from('ingresos_mercaderia')
      .insert({
        producto_id: id,
        cantidad: diferencia,
        cantidad_ingresada: stock,
        fecha: new Date().toISOString(),
        motivo,
        costo_unitario: costoUnit,
        costo_total: Math.abs(diferencia) * costoUnit,
        creado_por: userId || null,
      } as never)
      .select()
      .maybeSingle()

    console.log('Respuesta de inserción ingresos_mercaderia:', data, error)

    if (error) {
      console.error('Error al insertar ajuste en ingresos_mercaderia:', error)
    }

    return {
      ingreso_id: data?.id ?? null,
      stock_actual: fila.stock_actual,
      delta: diferencia,
    }
  }

  return { ingreso_id: null, stock_actual: fila.stock_actual, delta: diferencia }
}