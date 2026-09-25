import type {
  ProveedoresInsert,
  ProveedoresRow,
  RegistrarCompraItem,
  RegistrarCompraResult,
} from '../types/database.types'
import { getFriendlyError } from '../utils/errors'
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

/**
 * Registra una compra atómica: todos los productos se suman al inventario en
 * UNA transacción y el compra_id lo genera el servidor.
 */
export async function registrarCompra(input: {
  proveedorId: string | null
  nombreProveedor: string | null
  comprobante: string | null
  items: RegistrarCompraItem[]
  idempotencyKey: string
}): Promise<RegistrarCompraResult> {
  const { data, error } = await supabase.rpc('registrar_compra', {
    p_proveedor_id: input.proveedorId,
    p_nombre_proveedor: input.nombreProveedor,
    p_comprobante: input.comprobante,
    p_items: input.items,
    p_idempotency_key: input.idempotencyKey,
  })

  if (error) {
    throw new Error(
      getFriendlyError(
        new Error(error.message),
        'No se pudo registrar la compra. Inténtalo de nuevo.',
      ),
    )
  }

  if (!data) {
    throw new Error('No se pudo registrar la compra. Verifica tus permisos e inténtalo de nuevo.')
  }

  return data
}
