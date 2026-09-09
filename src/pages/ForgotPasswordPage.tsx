import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AuthCard,
  authButtonClass,
  authInputClass,
  authLabelClass,
} from '../components/auth/AuthCard'
import { Toast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import { getAuthErrorMessage } from '../utils/errors'

type Notice = {
  type: 'success' | 'error'
  message: string
}

type LimitState = {
  count: number
  windowStart: number
}

const MAX_ATTEMPTS = 3
const COOLDOWN_HOURS = 3
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000
const STORAGE_KEY = 'pwd_reset_limit'

const cancelButtonClass =
  'h-12 w-full rounded-xl border border-white/10 text-base font-semibold text-slate-300 transition-colors hover:bg-white/5'

function readLimit(): LimitState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LimitState>
      if (
        typeof parsed.count === 'number' &&
        typeof parsed.windowStart === 'number'
      ) {
        return { count: parsed.count, windowStart: parsed.windowStart }
      }
    }
  } catch {
    // almacenamiento no disponible: se ignora
  }
  return { count: 0, windowStart: 0 }
}

function writeLimit(state: LimitState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // almacenamiento no disponible: se ignora
  }
}

function formatUntil(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) {
    return `en ${minutes} minuto${minutes === 1 ? '' : 's'}`
  }
  if (minutes === 0) {
    return `${hours} hora${hours === 1 ? '' : 's'}`
  }
  return `${hours} hora${hours === 1 ? '' : 's'} y ${minutes} minutos`
}

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const [limit, setLimit] = useState<LimitState>(() => readLimit())
  const [confirmingAttempt, setConfirmingAttempt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const showNotice = (type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ type, message })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000)
  }

  useEffect(() => {
    return () => window.clearTimeout(noticeTimer.current)
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(id)
  }, [])

  const inCooldown = limit.windowStart > 0 && now < limit.windowStart + COOLDOWN_MS
  const attemptsUsed = inCooldown ? Math.min(limit.count, MAX_ATTEMPTS) : 0
  const remaining = MAX_ATTEMPTS - attemptsUsed
  const blockedUntilMs = inCooldown ? limit.windowStart + COOLDOWN_MS - now : 0

  const doSend = async (): Promise<void> => {
    if (submitting || remaining <= 0) return
    setSubmitting(true)
    const at = Date.now()
    const nextState: LimitState =
      inCooldown && limit.windowStart > 0
        ? { count: attemptsUsed + 1, windowStart: limit.windowStart }
        : { count: 1, windowStart: at }
    setLimit(nextState)
    writeLimit(nextState)
    try {
      await resetPassword(email.trim())
      setSent(true)
    } catch (cause) {
      showNotice('error', getAuthErrorMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting || remaining <= 0) return

    const attemptNumber = MAX_ATTEMPTS - remaining + 1
    if (attemptNumber === MAX_ATTEMPTS) {
      setConfirmingAttempt(MAX_ATTEMPTS)
      return
    }
    if (attemptNumber === MAX_ATTEMPTS - 1) {
      setConfirmingAttempt(MAX_ATTEMPTS - 1)
      return
    }
    await doSend()
  }

  return (
    <>
      <AuthCard
        title="Recuperar contraseña"
        subtitle="Te enviaremos un enlace para restablecer tu contraseña."
      >
        {sent ? (
          <div className="fade-up rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-6 text-center">
            <p className="text-lg font-bold text-emerald-200">
              Revisa tu correo electrónico
            </p>
            <p className="mt-2 text-sm text-emerald-300">
              Si existe una cuenta con ese correo, el enlace llegará en unos
              minutos. Míralo también en Spam y Promociones. Dura 1 hora y solo
              sirve una vez; si lo pides varias veces seguidas, espera unos
              minutos entre pedido y pedido.
            </p>
            <Link to="/login" className={`mt-5 inline-block ${authButtonClass}`}>
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

            {attemptsUsed > 0 && remaining > 0 ? (
              <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-center text-sm font-semibold text-amber-200">
                Ya usaste {attemptsUsed} de {MAX_ATTEMPTS} intentos. Te quedan{' '}
                {remaining} {remaining === 1 ? 'intento' : 'intentos'}.
              </p>
            ) : remaining === MAX_ATTEMPTS ? (
              <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-slate-400">
                Tienes {MAX_ATTEMPTS} intentos. Al agotarlos, deberás esperar{' '}
                {COOLDOWN_HOURS} horas para volver a intentar.
              </p>
            ) : (
              <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-center text-sm font-bold text-rose-200">
                Agotaste tus {MAX_ATTEMPTS} intentos. Podrás volver a intentar{' '}
                {formatUntil(blockedUntilMs)}.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || remaining <= 0}
              className={authButtonClass}
            >
              {submitting
                ? 'Enviando…'
                : remaining <= 0
                  ? 'Intenta más tarde'
                  : 'Enviar enlace'}
            </button>

            <Link
              to="/login"
              className="text-center text-sm font-semibold text-slate-400 hover:text-white"
            >
              ← Volver al inicio de sesión
            </Link>
          </form>
        )}

        {confirmingAttempt === MAX_ATTEMPTS - 1 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[2rem] bg-slate-950/90 p-8 backdrop-blur-sm">
            <div className="fade-up text-center">
              <span className="text-4xl" aria-hidden="true">
                🤔
              </span>
              <h2 className="mt-2 text-lg font-black text-white">
                ¿Quieres recuperar tu contraseña?
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Este es tu intento número {MAX_ATTEMPTS - 1} de {MAX_ATTEMPTS}.
                Si confirmas, te quedará solo 1 intento más.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void doSend()}
                  className={`${authButtonClass} disabled:opacity-60`}
                >
                  {submitting ? 'Enviando…' : 'Sí, enviar el enlace'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirmingAttempt(0)}
                  className={cancelButtonClass}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmingAttempt === MAX_ATTEMPTS && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[2rem] bg-slate-950/90 p-8 backdrop-blur-sm">
            <div className="fade-up text-center">
              <span className="text-4xl" aria-hidden="true">
                ⚠️
              </span>
              <h2 className="mt-2 text-lg font-black text-rose-300">
                ¡Cuidado! Es tu último intento
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                Este es el intento {MAX_ATTEMPTS} de {MAX_ATTEMPTS}. Después de
                este, <strong>no podrás intentarlo de nuevo durante{' '}
                {COOLDOWN_HOURS} horas</strong>. ¿Quieres continuar?
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void doSend()}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-base font-black uppercase tracking-[0.15em] text-white shadow-[0_14px_35px_-12px_rgba(244,63,94,0.6)] transition-all hover:from-rose-400 hover:to-rose-500 active:scale-[0.99] disabled:opacity-60"
                >
                  {submitting ? 'Enviando…' : 'Sí, estoy seguro'}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setConfirmingAttempt(0)}
                  className={cancelButtonClass}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </AuthCard>

      {notice && <Toast type={notice.type} message={notice.message} />}
    </>
  )
}