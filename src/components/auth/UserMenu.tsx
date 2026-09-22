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
  const { user, rol, signOut } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error'; message: string } | null>(null)

  const displayName =
    getMetaString(user, 'full_name') ||
    getMetaString(user, 'name') ||
    user?.email ||
    ''
  const avatarUrl = getMetaString(user, 'avatar_url') || getMetaString(user, 'picture')
  const initial = displayName.trim().charAt(0).toUpperCase() || '?'
  const rolLabel = rol === 'admin' ? 'Admin' : 'Cajero'

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
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-ink">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-ink lg:block">
          {displayName}
          <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-300">
            {rolLabel}
          </span>
        </span>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-3 disabled:cursor-wait disabled:opacity-50"
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
          <span className="hidden sm:inline">
            {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </span>
        </button>
      </div>
      {notice && <Toast type={notice.type} message={notice.message} />}
    </>
  )
}