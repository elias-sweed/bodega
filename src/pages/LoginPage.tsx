import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Aurora from '../components/Aurora'
import { Toast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../utils/errors'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const inputClass =
  'h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-indigo-400 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20'
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-300'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="absolute inset-0" aria-hidden="true">
        <Aurora
          colorStops={['#7cff67', '#B497CF', '#5227FF']}
          blend={0.5}
          amplitude={1.0}
          speed={0.35}
        />
      </div>

      <div className="fade-up relative w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl text-white shadow-lg shadow-indigo-500/30">
            🛒
          </span>
          <div>
            <span className="block text-xl font-black text-white">
              Bodega POS
            </span>
            <span className="block text-xs font-medium text-slate-400">
              Caja e inventario en un solo lugar
            </span>
          </div>
        </div>

        <h2
          className="fade-up text-2xl font-black text-white"
          style={{ animationDelay: '0.08s' }}
        >
          Inicia sesión
        </h2>
        <p
          className="fade-up mt-1 text-sm text-slate-400"
          style={{ animationDelay: '0.14s' }}
        >
          Entra con tu cuenta para gestionar la bodega.
        </p>

        <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
          <div className="fade-up" style={{ animationDelay: '0.2s' }}>
            <label htmlFor="email" className={labelClass}>
              Correo electrónico
            </label>
            <input
              id="email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <div className="fade-up" style={{ animationDelay: '0.26s' }}>
            <label htmlFor="password" className={labelClass}>
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
                className={`${inputClass} pr-16`}
                placeholder="Tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword((show) => !show)}
                className="absolute inset-y-0 right-4 text-sm font-semibold text-indigo-300 hover:text-indigo-200"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <div
            className="fade-up -mt-1 text-right"
            style={{ animationDelay: '0.32s' }}
          >
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div className="fade-up" style={{ animationDelay: '0.38s' }}>
            <button
              type="submit"
              disabled={submitting || loading}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-base font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-400 hover:to-violet-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:shadow-none"
            >
              {submitting ? 'Iniciando…' : 'Iniciar sesión'}
            </button>
          </div>
        </form>

        <p
          className="fade-up mt-8 text-center text-sm text-slate-400"
          style={{ animationDelay: '0.44s' }}
        >
          ¿No tienes cuenta?{' '}
          <span className="font-semibold text-slate-200">
            Contacta al administrador
          </span>
        </p>
      </div>

      {notice && <Toast type={notice.type} message={notice.message} />}
    </div>
  )
}