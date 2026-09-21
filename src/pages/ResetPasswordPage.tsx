import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AuthCard,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../components/auth/AuthCard'
import { Toast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../utils/errors'
import { validarClaveNueva } from '../utils/password'

type Notice = {
  type: 'success' | 'error'
  message: string
}

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

    const errorClave = validarClaveNueva(newPassword)
    if (errorClave) {
      showToast('error', errorClave)
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
    <>
      <AuthCard
        title="Nueva contraseña"
        subtitle="Define una nueva contraseña para tu cuenta."
      >
        {sessionReady && !user ? (
          <div className="fade-up rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-center">
            <p className="text-lg font-bold text-rose-200">
              El enlace no es válido
            </p>
            <p className="mt-2 text-sm text-rose-300">
              Este enlace de recuperación es inválido, expiró o ya fue usado.
              Solicita uno nuevo para continuar.
            </p>
            <Link to="/forgot-password" className={`mt-5 inline-block ${authButtonClass}`}>
              Solicitar nuevo enlace
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="new-password" className={authLabelClass}>
                Nueva contraseña
              </label>
              <input
                id="new-password"
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={authInputClass}
                placeholder="Mínimo 8 caracteres, nada de 123456"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className={authLabelClass}>
                Confirmar nueva contraseña
              </label>
              <input
                id="confirm-password"
                required
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={authInputClass}
                placeholder="Repite la contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className={authButtonClass}
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
      </AuthCard>

      {notice && <Toast type={notice.type} message={notice.message} />}
    </>
  )
}