import type { UsuarioRol } from '../types/database.types'
import { supabase } from './supabase'

export async function fetchRol(email: string): Promise<UsuarioRol | null> {
  const { data, error } = await supabase
    .from('usuarios_autorizados')
    .select('rol')
    .eq('email', email)
    .maybeSingle()

  if (error) {
    throw new Error('No se pudo verificar tu rol de acceso')
  }

  const rol = data?.rol
  return rol === 'admin' || rol === 'cajero' ? rol : null
}