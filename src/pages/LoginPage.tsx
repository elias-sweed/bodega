import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import {
  AuthCard,
  authButtonClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
} from '../components/auth/AuthCard'
import { Toast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../utils/errors'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const LOCK_KEY = 'bodega:login-bloqueo:v1'
const MAX_INTENTOS = 5
const BLOQUEO_MS = 60_000

interface LockState {
  fails: number
  lockedUntil: number
}

function readLock(): LockState {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return { fails: 0, lockedUntil: 0 }
    const parsed = JSON.parse(raw) as Partial<LockState>
    return {
      fails: Number(parsed.fails) || 0,
      lockedUntil: Number(parsed.lockedUntil) || 0,
    }
  } catch {
    return { fails: 0, lockedUntil: 0 }
  }
}

function writeLock(state: LockState): void {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(state))
  } catch {
    // sin almacenamiento no hay bloqueo: se sigue intentando normal
  }
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `0:${String(s).padStart(2, '0')}`
}

export function LoginPage() {
  const { user, loading, signInWithPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectParam = searchParams.get('redirect')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [lock, setLock] = useState<LockState>(() => readLock())
  const [, setTick] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  const locked = Date.now() < lock.lockedUntil

  // Reloj del candado: actualiza la cuenta regresiva cada segundo
  useEffect(() => {
    if (!locked) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [locked, lock.lockedUntil])

  useEffect(() => {
    if (!locked) {
      const current = readLock()
      if (current.lockedUntil !== 0 || current.fails !== 0) {
        writeLock({ fails: 0, lockedUntil: 0 })
        setLock({ fails: 0, lockedUntil: 0 })
      }
    }
    // Solo al vencer el bloqueo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked])

  const showNotice = (type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ type, message })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000)
  }

  useEffect(() => {
    return () => window.clearTimeout(noticeTimer.current)
  }, [])

  useEffect(() => {
    if (!loading && user) {
      const target =
        redirectParam && redirectParam.startsWith('/') ? redirectParam : '/'
      navigate(target, { replace: true })
    }
  }, [loading, user, navigate, redirectParam])

  const handleLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting) return

    const cleanEmail = email.trim().toLowerCase()
    let valid = true
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Escribe un correo válido (ej. nombre@correo.com).')
      valid = false
    } else {
      setEmailError(null)
    }
    if (password.length < 6) {
      setPasswordError('La contraseña tiene al menos 6 caracteres.')
      valid = false
    } else {
      setPasswordError(null)
    }
    if (!valid) return

    if (Date.now() < readLock().lockedUntil) {
      setLock(readLock())
      showNotice(
        'error',
        `Demasiados intentos fallidos. Espera ${formatCountdown(readLock().lockedUntil - Date.now())} e inténtalo de nuevo.`,
      )
      return
    }

    setSubmitting(true)
    try {
      await signInWithPassword(cleanEmail, password)
      writeLock({ fails: 0, lockedUntil: 0 })
      setLock({ fails: 0, lockedUntil: 0 })
    } catch (cause) {
      const nextFails = readLock().fails + 1
      if (nextFails >= MAX_INTENTOS) {
        const next: LockState = { fails: nextFails, lockedUntil: Date.now() + BLOQUEO_MS }
        writeLock(next)
        setLock(next)
        showNotice(
          'error',
          'Demasiados intentos fallidos. La entrada se bloqueó por 1 minuto.',
        )
      } else {
        writeLock({ fails: nextFails, lockedUntil: 0 })
        setLock({ fails: nextFails, lockedUntil: 0 })
        showNotice('error', getAuthErrorMessage(cause))
      }
      setSubmitting(false)
    }
  }

  return (
    <>
      <AuthCard
        title="Inicia sesión"
        subtitle="Entra con tu cuenta para gestionar tu bodega."
      >
        <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
          <div>
            <label htmlFor="email" className={authLabelClass}>
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError(null)
              }}
              aria-invalid={emailError !== null}
              className={`${authInputClass} ${emailError ? 'border-rose-400/70 focus:border-rose-300' : ''}`}
              placeholder="nombre.apellido@correo.com"
            />
            {emailError && (
              <p role="alert" className="mt-1.5 text-xs font-bold text-rose-300">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className={authLabelClass}>
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordError) setPasswordError(null)
                }}
                aria-invalid={passwordError !== null}
                className={`${authInputClass} pr-14 ${passwordError ? 'border-rose-400/70 focus:border-rose-300' : ''}`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                className="absolute inset-y-0 right-3 flex items-center text-amber-300 transition-colors hover:text-amber-200"
              >
                {showPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
            {passwordError && (
              <p role="alert" className="mt-1.5 text-xs font-bold text-rose-300">
                {passwordError}
              </p>
            )}
          </div>

          {locked && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-2.5 text-xs font-bold text-amber-200"
            >
              <ShieldAlert size={15} aria-hidden="true" className="shrink-0" />
              Entrada bloqueada por intentos fallidos. Espera{' '}
              {formatCountdown(lock.lockedUntil - Date.now())}.
            </p>
          )}

          <div className="-mt-1 text-right">
            <Link to="/forgot-password" className={authLinkClass}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting || loading || locked}
            className={authButtonClass}
          >
            {locked
              ? `Espera ${formatCountdown(lock.lockedUntil - Date.now())}`
              : submitting
                ? 'Iniciando…'
                : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-400">
          ¿No tienes cuenta?{' '}
          <span className="font-semibold text-slate-200">
            Contacta al administrador
          </span>
        </p>
      </AuthCard>

      {notice && <Toast type={notice.type} message={notice.message} />}
    </>
  )
}
