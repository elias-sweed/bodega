import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
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

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (cause) {
      showNotice('success', getAuthErrorMessage(cause))
      setSent(true)
    } finally {
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
          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Recuperar contraseña
          </h1>
          <p className="text-sm text-slate-500">
            Te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-emerald-50 p-6 text-center">
            <p className="text-lg font-bold text-emerald-700">
              Revisa tu correo electrónico
            </p>
            <p className="mt-2 text-sm text-emerald-600">
              Si existe una cuenta asociada a ese correo, recibirás un enlace
              para definir una nueva contraseña.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block rounded-xl bg-sky-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98]"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            <button
              type="submit"
              disabled={submitting}
              className="h-14 w-full rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {submitting ? 'Enviando…' : 'Enviar enlace'}
            </button>

            <Link
              to="/login"
              className="text-center text-sm font-semibold text-slate-500 hover:text-slate-700"
            >
              ← Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>

      {notice && <Toast type={notice.type} message={notice.message} />}
    </div>
  )
}