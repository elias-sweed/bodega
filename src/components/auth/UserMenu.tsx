import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Toast } from '../common/Toast'

function getMetaString(user: User | null, key: string): string {
  const meta = user?.user_metadata as Record<string, unknown> | undefined
  const value = meta?.[key]
  return typeof value === 'string' ? value : ''
}

export function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error'; message: string } | null>(null)

  const displayName =
    getMetaString(user, 'full_name') ||
    getMetaString(user, 'name') ||
    user?.email ||
    ''
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'

  const handleSignOut = async (): Promise<void> => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setNotice({
        type: 'error',
        message: 'No se pudo cerrar la sesión. Inténtalo de nuevo.',
      })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-slate-900 ring-2 ring-amber-200/25 sm:h-9 sm:w-9"
          aria-label={`Usuario ${displayName}`}
          title={displayName}
        >
          {initial}
        </span>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          aria-label={signingOut ? 'Cerrando sesión' : 'Cerrar sesión'}
          title={signingOut ? 'Cerrando sesión' : 'Cerrar sesión'}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-300/35 bg-rose-500/15 text-rose-200 transition-colors hover:border-rose-300/60 hover:bg-rose-500 hover:text-white disabled:cursor-wait disabled:opacity-50 sm:h-10 sm:w-10"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
      {notice && <Toast type={notice.type} message={notice.message} />}
    </>
  )
}