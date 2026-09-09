export type ToastType = 'success' | 'error'

interface ToastProps {
  type: ToastType
  message: string
}

const STYLES = {
  success: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    bar: 'bg-emerald-500',
    title: 'Listo',
  },
  error: {
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
    bar: 'bg-rose-500',
    title: 'Ocurrió un problema',
  },
} as const

export function Toast({ type, message }: ToastProps) {
  const style = STYLES[type]

  return (
    <div
      role="status"
      className="toast-enter fixed right-4 top-4 z-[60] flex w-[min(92vw,22rem)] items-start overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
    >
      <span
        className={`mr-3 mt-0.5 h-auto w-1.5 shrink-0 self-stretch rounded-full ${style.bar}`}
        aria-hidden="true"
      />
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ${style.iconBg} ${style.iconText}`}
        aria-hidden="true"
      >
        {type === 'success' ? '✓' : '✕'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{style.title}</p>
        <p className="mt-0.5 text-sm leading-snug text-slate-600">{message}</p>
      </div>
    </div>
  )
}