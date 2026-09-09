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

export async function addUsuarioAutorizado(
  email: string,
  rol: UsuarioRol,
): Promise<UsuariosAutorizadosRow> {
  const { data, error } = await supabase
    .from('usuarios_autorizados')
    .insert({ email: email.trim().toLowerCase(), rol })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateUsuarioRol(
  email: string,
  rol: UsuarioRol,
): Promise<UsuariosAutorizadosRow> {
  const { data, error } = await supabase
    .from('usuarios_autorizados')
    .update({ rol })
    .eq('email', email)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function removeUsuarioAutorizado(email: string): Promise<void> {
  const { error } = await supabase
    .from('usuarios_autorizados')
    .delete()
    .eq('email', email)

  if (error) {
    throw new Error(error.message)
  }
}