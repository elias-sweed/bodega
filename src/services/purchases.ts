import type {
  ProveedoresInsert,
  ProveedoresRow,
  RegistrarIngresoArgs,
  RegistrarIngresoResult,
} from '../types/database.types'
import { supabase } from './supabase'

export async function fetchProveedores(): Promise<ProveedoresRow[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function createProveedor(
  proveedor: ProveedoresInsert,
): Promise<ProveedoresRow> {
  const { data, error } = await supabase
    .from('proveedores')
    .insert(proveedor)
    .select()
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('No se pudo crear el proveedor. Verifica tus permisos e inténtalo de nuevo.')
  }

  return data
}

export async function deleteProveedor(id: string): Promise<void> {
  const { error } = await supabase.from('proveedores').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function registrarIngresoMercaderia(input: {
  compraId: string
  proveedorId: string | null
  nombreProveedor: string | null
  comprobante: string | null
  productoId: string
  cantidad: number
  costoTotal: number
}): Promise<RegistrarIngresoResult> {
  const rpcArgs: RegistrarIngresoArgs = {
    p_compra_id: input.compraId,
    p_proveedor_id: input.proveedorId,
    p_nombre_proveedor: input.nombreProveedor,
    p_producto_id: input.productoId,
    p_cantidad: input.cantidad,
    p_costo_total: input.costoTotal,
    p_comprobante: input.comprobante?.trim() || null,
  }

  const { data, error } = await supabase.rpc('registrar_ingreso', rpcArgs)

  if (error) {
    throw new Error(error.message)
  }

  return data
}