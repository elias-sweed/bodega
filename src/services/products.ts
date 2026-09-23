import type {
  ActualizarProductoResult,
  CargarInventarioInicialItem,
  CargarInventarioInicialResult,
  ProductosInsert,
  ProductosRow,
  RegistrarAjusteManualResult,
} from '../types/database.types'
import { getFriendlyError } from '../utils/errors'
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
  const { data, error } = await supabase.rpc('crear_producto', {
    p_nombre: product.nombre,
    p_categoria: product.categoria,
    p_codigo_barras: product.codigo_barras,
    p_precio_venta: product.precio_venta,
    p_costo: product.costo,
    p_stock_inicial: product.stock_actual,
    p_stock_minimo: product.stock_minimo,
  })

  if (error) {
    throw new Error(
      getFriendlyError(error, 'No se pudo crear el producto. Inténtalo de nuevo.'),
    )
  }

  if (!data) {
    throw new Error('No se pudo crear el producto. Verifica tus permisos e inténtalo de nuevo.')
  }

  return data
}

export async function cargarInventarioInicial(
  items: CargarInventarioInicialItem[],
): Promise<CargarInventarioInicialResult> {
  if (items.length === 0) {
    throw new Error('Agrega al menos un producto para cargar el inventario.')
  }

  const { data, error } = await supabase.rpc('cargar_inventario_inicial', {
    p_items: items,
  })

  if (error) {
    throw new Error(
      getFriendlyError(
        new Error(error.message),
        'No se pudo cargar el inventario inicial. Inténtalo de nuevo.',
      ),
    )
  }

  if (!data) {
    throw new Error('No se pudo cargar el inventario inicial. Inténtalo de nuevo.')
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
): Promise<RegistrarAjusteManualResult> {
  const stock = Math.max(0, Math.round(nuevoStock))
  const { data, error } = await supabase.rpc('registrar_ajuste_manual', {
    p_producto_id: id,
    p_nuevo_stock: stock,
    p_es_regalo: esRegalo,
    p_motivo: motivo.trim() || 'Corrección de inventario',
  })

  if (error) {
    throw new Error(error.message)
  }
  if (!data) {
    throw new Error('No se pudo ajustar el stock. Inténtalo de nuevo.')
  }
  return data
}