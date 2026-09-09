import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Aurora from '../components/Aurora'
import { Toast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../utils/errors'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const inputClass =
  'h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-lg text-white outline-none transition-all placeholder:text-slate-500 focus:border-indigo-400 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20'
const labelClass = 'mb-1 block text-sm font-semibold text-slate-300'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="absolute inset-0" aria-hidden="true">
        <Aurora
          colorStops={['#7cff67', '#B497CF', '#5227FF']}
          blend={0.5}
          amplitude={1.0}
          speed={0.35}
        />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <span className="text-4xl" aria-hidden="true">
            🛒
          </span>
          <h1 className="mt-2 text-2xl font-black text-white">
            Nueva contraseña
          </h1>
          <p className="text-sm text-slate-400">
            Define una nueva contraseña para tu cuenta.
          </p>
        </div>

        {sessionReady && !user ? (
          <div className="rounded-2xl bg-rose-500/10 p-6 text-center">
            <p className="text-lg font-bold text-rose-200">
              El enlace no es válido
            </p>
            <p className="mt-2 text-sm text-rose-300">
              Este enlace de recuperación es inválido, expiró o ya fue usado.
              Solicita uno nuevo para continuar.
            </p>
            <Link
              to="/forgot-password"
              className="mt-5 inline-block rounded-xl bg-indigo-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-indigo-400 active:scale-[0.98]"
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
              className="h-14 w-full rounded-2xl bg-indigo-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-indigo-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {submitting ? 'Guardando…' : 'Actualizar contraseña'}
            </button>

            <Link
              to="/login"
              className="text-center text-sm font-semibold text-slate-400 hover:text-white"
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