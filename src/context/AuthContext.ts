import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { UsuarioRol } from '../types/database.types'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  rol: UsuarioRol | null
  roleLoading: boolean
  isPasswordRecovery: boolean
  /** true cuando la sesión se cerró sola (vencimiento/fallo) y hay que avisar */
  sessionExpired: boolean
  acknowledgeExpired: () => void
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)