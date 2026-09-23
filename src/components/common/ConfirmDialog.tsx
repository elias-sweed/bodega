import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fade-in fixed inset-0 z-40 flex items-center justify-center bg-[#0b0420]/85 p-4 backdrop-blur-md"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="fade-up w-full max-w-sm rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/40 bg-gold/15 text-gold">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-200 hover:bg-surface-3 hover:text-ink"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <h2 className="mt-4 text-xl font-black tracking-tighter text-ink">{title}</h2>
        <p className="mt-1.5 text-sm font-medium leading-relaxed text-muted">
          {description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-2xl border border-line bg-surface text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-12 rounded-2xl border border-rose-200/30 bg-rose-500 text-sm font-black text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
