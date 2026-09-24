import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error'

interface ToastProps {
  type: ToastType
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

const STYLES = {
  success: {
    iconWrap: 'border-emerald-200/30 bg-emerald-400/20 text-profit',
    bar: 'bg-emerald-300',
    title: 'Listo',
    Icon: CheckCircle2,
  },
  error: {
    iconWrap: 'border-rose-200/30 bg-rose-400/20 text-loss',
    bar: 'bg-rose-300',
    title: 'Ocurrió un problema',
    Icon: AlertTriangle,
  },
} as const

export function Toast({ type, message, action }: ToastProps) {
  const style = STYLES[type]
  const { Icon } = style

  return createPortal(
    <div className="app-shell">
      <div
        role={type === 'error' ? 'alert' : 'status'}
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        className="toast-enter pointer-events-auto fixed inset-x-3 top-24 z-100 flex max-h-[calc(100dvh-6rem)] w-[calc(100vw-1.5rem)] max-w-[24rem] items-start gap-3 overflow-y-auto rounded-[20px] border border-white/25 bg-surface-3 p-4 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.95),0_0_40px_-20px_rgba(139,92,246,0.45)] ring-1 ring-white/10 backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:w-96 lg:right-6"
      >
        <span
          className={`w-1.5 shrink-0 self-stretch rounded-full ${style.bar}`}
          aria-hidden="true"
        />
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${style.iconWrap}`}
          aria-hidden="true"
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight text-ink">{style.title}</p>
          <p className="mt-0.5 wrap-break-word text-sm font-medium leading-snug text-muted">{message}</p>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-2 w-full rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-center text-xs font-black text-ink transition-all duration-200 hover:bg-surface-3 active:scale-95 sm:w-auto sm:text-left"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}