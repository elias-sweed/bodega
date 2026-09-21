import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'
import { supabase } from '../services/supabase'
import { fetchRol } from '../services/roles'
import type { UsuarioRol } from '../types/database.types'

function getAppUrl(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [rol, setRol] = useState<UsuarioRol | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [roleRetry, setRoleRetry] = useState(0)
  const lastUserEmail = useRef<string | null>(null)

  const isRecoveryContext = (): boolean =>
    window.location.hash.includes('type=recovery')

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const nextSession = data.session
      const nextUser = nextSession?.user ?? null
      setSession(nextSession)
      setUser(nextUser)
      setLoading(false)
      const email = nextUser?.email ?? null
      if (lastUserEmail.current !== email) {
        lastUserEmail.current = email
        setRol(null)
        setRoleLoading(true)
      }
      setIsPasswordRecovery(isRecoveryContext())
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!active) return
        const nextUser = nextSession?.user ?? null
        setSession(nextSession)
        setUser(nextUser)
        setLoading(false)
        const email = nextUser?.email ?? null
        if (lastUserEmail.current !== email) {
          lastUserEmail.current = email
          setRol(null)
          setRoleLoading(true)
        }
        setIsPasswordRecovery(
          event === 'PASSWORD_RECOVERY' ||
            (event === 'INITIAL_SESSION' && isRecoveryContext()),
        )
      },
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!roleLoading) return
    const timer = window.setTimeout(() => {
      setRoleRetry((retry) => retry + 1)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [roleLoading, roleRetry])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const email = user?.email
      if (!email) {
        if (!cancelled) {
          setRol(null)
          setRoleLoading(false)
        }
        return
      }

      try {
        const role = await fetchRol(email)
        if (!cancelled) {
          setRol(role)
        }
      } catch {
        if (!cancelled) {
          setRol(null)
        }
      } finally {
        if (!cancelled) {
          setRoleLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.email, roleRetry])

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<void> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        throw new Error(error.message)
      }
    },
    [],
  )

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }, [])

  // Cierre automático por inactividad (PC compartida): 30 min sin tocar
  // nada cierra la sesión sola para que nadie quede dentro.
  useEffect(() => {
    if (!user) return
    const LIMITE_MIN = 30
    let timer = window.setTimeout(
      () => void signOut().catch(() => undefined),
      LIMITE_MIN * 60_000,
    )
    const reiniciar = (): void => {
      window.clearTimeout(timer)
      timer = window.setTimeout(
        () => void signOut().catch(() => undefined),
        LIMITE_MIN * 60_000,
      )
    }
    const eventos = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
    for (const evento of eventos) {
      window.addEventListener(evento, reiniciar, { passive: true })
    }
    return () => {
      window.clearTimeout(timer)
      for (const evento of eventos) {
        window.removeEventListener(evento, reiniciar)
      }
    }
  }, [user, signOut])

  const resetPassword = useCallback(
    async (email: string): Promise<void> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getAppUrl()}/reset-password`,
      })
      if (error) {
        throw new Error(error.message)
      }
    },
    [],
  )

  const updatePassword = useCallback(
    async (password: string): Promise<void> => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        throw new Error(error.message)
      }
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      rol,
      roleLoading,
      isPasswordRecovery,
      signInWithPassword,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [
      user,
      session,
      loading,
      rol,
      roleLoading,
      isPasswordRecovery,
      signInWithPassword,
      signOut,
      resetPassword,
      updatePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}