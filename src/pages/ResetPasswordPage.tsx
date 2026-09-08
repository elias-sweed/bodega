import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export function ResetPasswordPage() {
  const { user, loading, updatePassword, signOut } = useAuth()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  const showToast = (type: Notice['type'], message: string): void => {
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

    if (newPassword.length < 6) {
      showToast('error', 'La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(newPassword)
      await signOut()
      showToast('success', 'Contraseña actualizada correctamente.')
      navigate('/login', { replace: true })
    } catch (cause) {
      showToast('error', getAuthErrorMessage(cause))
      setSubmitting(false)
    }
  }

  const sessionReady = !loading

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl" aria-hidden="true">
            🛒
          </span>
          <h1 className="mt-2 text-2xl font-black text-slate-900">
            Nueva contraseña
          </h1>
          <p className="text-sm text-slate-500">
            Define una nueva contraseña para tu cuenta.
          </p>
        </div>

        {sessionReady && !user ? (
          <div className="rounded-2xl bg-rose-50 p-6 text-center">
            <p className="text-lg font-bold text-rose-700">
              El enlace no es válido
            </p>
            <p className="mt-2 text-sm text-rose-600">
              Este enlace de recuperación es inválido, expiró o ya fue usado.
              Solicita uno nuevo para continuar.
            </p>
            <Link
              to="/forgot-password"
              className="mt-5 inline-block rounded-xl bg-sky-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98]"
            >
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="new-password" className={labelClass}>
                Nueva contraseña
              </label>
              <input
                id="new-password"
                required
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className={labelClass}>
                Confirmar nueva contraseña
              </label>
              <input
                id="confirm-password"
                required
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Repite la contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="h-14 w-full rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {submitting ? 'Guardando…' : 'Actualizar contraseña'}
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