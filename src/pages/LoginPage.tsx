import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Toast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../utils/errors'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const inputClass =
  'h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400'
const labelClass = 'mb-1 block text-sm font-semibold text-slate-600'

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
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl" aria-hidden="true">
            🛒
          </span>
          <h1 className="mt-2 text-2xl font-black text-slate-900">Bodega POS</h1>
          <p className="text-sm text-slate-500">
            Inicia sesión para gestionar tu bodega.
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
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

          <div>
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
                className="absolute inset-y-0 right-3 text-sm font-semibold text-sky-600 hover:text-sky-700"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className="h-14 w-full rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {submitting ? 'Iniciando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            to="/forgot-password"
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>

      {notice && <Toast type={notice.type} message={notice.message} />}
    </div>
  )
}