import type {
  UsuarioRol,
  UsuariosAutorizadosRow,
} from '../types/database.types'
import { supabase } from './supabase'

export async function fetchUsuariosAutorizados(): Promise<UsuariosAutorizadosRow[]> {
  const { data, error } = await supabase
    .from('usuarios_autorizados')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateUsuarioRol(
  email: string,
  rol: UsuarioRol,
): Promise<Pick<UsuariosAutorizadosRow, 'email' | 'rol'>> {
  const { data, error } = await supabase.rpc('cambiar_rol_usuario', {
    p_email: email,
    p_rol: rol,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('No se encontró al usuario autorizado o no tienes permisos para editarlo.')
  }

  return data
}

export async function removeUsuarioAutorizado(email: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_usuario_autorizado', {
    p_email: email,
  })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Crea la cuenta de acceso + otorga el rol en un solo paso, llamando a la
 * Edge Function `crear-usuario` (desplegada en Supabase). Si el correo ya
 * tenía cuenta, solo le otorga/actualiza el acceso.
 */
export async function crearCuentaConAcceso(
  email: string,
  rol: 'admin' | 'cajero',
): Promise<{ existed: boolean }> {
  const { data, error } = await supabase.functions.invoke('crear-usuario', {
    body: { email: email.trim().toLowerCase(), rol },
  })

  if (error) {
    throw new Error(error.message)
  }
  if (data?.error) {
    throw new Error(String(data.error))
  }
  return { existed: Boolean(data?.existed) }
}