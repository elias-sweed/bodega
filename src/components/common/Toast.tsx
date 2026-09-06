export type ToastType = 'success' | 'error'

interface ToastProps {
  type: ToastType
  message: string
}

export function Toast({ type, message }: ToastProps) {
  const isSuccess = type === 'success'

  return (
    <div
      role="status"
      className={`fixed inset-x-0 bottom-6 z-30 mx-auto w-max max-w-[90vw] rounded-2xl px-6 py-3 text-lg font-bold text-white shadow-xl ${
        isSuccess ? 'bg-emerald-500' : 'bg-rose-600'
      }`}
    >
      {isSuccess ? '✓' : '✕'} {message}
    </div>
  )
}