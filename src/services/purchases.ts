import type {
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

export async function registrarIngreso(
  input: RegistrarIngresoArgs,
): Promise<RegistrarIngresoResult> {
  const { data, error } = await supabase.rpc('registrar_ingreso', input)

  if (error) {
    throw new Error(error.message)
  }

  return data
}