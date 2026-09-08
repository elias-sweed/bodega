import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'
import { supabase } from '../services/supabase'

function getAppUrl(): string {
  return import.meta.env.VITE_APP_URL || window.location.origin
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        setLoading(false)
      },
    )

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(
    async (redirect?: string | null): Promise<void> => {
      const suffix =
        redirect && redirect.startsWith('/')
          ? `/login?redirect=${encodeURIComponent(redirect)}`
          : ''
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${getAppUrl()}${suffix}` },
      })
      if (error) {
        throw new Error(error.message)
      }
    },
    [],
  )

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
      signInWithGoogle,
      signInWithPassword,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [
      user,
      session,
      loading,
      signInWithGoogle,
      signInWithPassword,
      signOut,
      resetPassword,
      updatePassword,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}