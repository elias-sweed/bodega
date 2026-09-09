import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

export function LoginPage() {
  const { user, loading, signInWithPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectParam = searchParams.get('redirect')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

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
    setSubmitting(true)
    try {
      await signInWithPassword(email.trim(), password)
    } catch (cause) {
      showNotice('error', getAuthErrorMessage(cause))
      setSubmitting(false)
    }
  }

  return (
    <>
      <AuthCard
        title="Inicia sesión"
        subtitle="Entra con tu cuenta para gestionar tu bodega."
      >
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className={authLabelClass}>
              Correo electrónico
            </label>
            <input
              id="email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className={authLabelClass}>
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${authInputClass} pr-20`}
                placeholder="Tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                className="absolute inset-y-0 right-4 text-sm font-bold uppercase tracking-wider text-amber-300 transition-colors hover:text-amber-200"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <div className="-mt-1 text-right">
            <Link to="/forgot-password" className={authLinkClass}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className={authButtonClass}
          >
            {submitting ? 'Iniciando…' : 'Iniciar sesión'}
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