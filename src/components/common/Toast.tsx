import { AlertTriangle, CheckCircle2 } from 'lucide-react'

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
    iconWrap: 'border-emerald-200/30 bg-emerald-400/20 text-emerald-200',
    bar: 'bg-emerald-300',
    title: 'Listo',
    Icon: CheckCircle2,
  },
  error: {
    iconWrap: 'border-rose-200/30 bg-rose-400/20 text-rose-200',
    bar: 'bg-rose-300',
    title: 'Ocurrió un problema',
    Icon: AlertTriangle,
  },
} as const

export function Toast({ type, message, action }: ToastProps) {
  const style = STYLES[type]
  const { Icon } = style

  return (
    <div
      role="status"
      className="toast-enter fixed right-4 top-4 z-[60] flex w-[min(92vw,22rem)] items-start gap-3 overflow-hidden rounded-[20px] border border-white/20 bg-gradient-to-br from-[#3b1d8f]/95 via-[#2a1568]/95 to-[#1a0b3d]/95 p-4 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
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
        <p className="text-sm font-black tracking-tight text-white">{style.title}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-white/70">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 rounded-xl border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-black text-white transition-all duration-200 hover:bg-white/25 active:scale-95"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
