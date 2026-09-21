import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'

interface ConfirmDeleteModalProps {
  product: ProductosRow
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function ConfirmDeleteModal({
  product,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async (): Promise<void> => {
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo eliminar el producto',
      )
      setSubmitting(false)
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmar-eliminar-title"
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#150834]/70 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="fade-up w-full max-w-sm rounded-[28px] border border-white/20 bg-gradient-to-br from-[#3b1d8f]/95 via-[#2a1568]/95 to-[#1a0b3d]/95 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-200/30 bg-rose-400/20 text-rose-200">
            <Trash2 size={22} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <h2
          id="confirmar-eliminar-title"
          className="mt-4 text-xl font-black tracking-tighter text-white"
        >
          Eliminar producto
        </h2>

        <p className="mt-1.5 text-sm font-medium leading-relaxed text-white/65">
          ¿Eliminar <strong className="font-extrabold text-white">{product.nombre}</strong>?
        </p>
        <p className="mt-1 text-xs font-medium text-white/45">
          Se quitará del catálogo y de futuras ventas.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-2xl border border-rose-200/30 bg-rose-400/20 px-4 py-2 text-sm font-bold text-rose-100"
          >
            {error}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-12 rounded-2xl border border-white/25 bg-white/10 text-sm font-extrabold text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="h-12 rounded-2xl border border-rose-200/30 bg-gradient-to-br from-rose-400/90 to-rose-600/90 text-sm font-black text-white shadow-[0_14px_36px_-14px_rgba(244,63,94,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {submitting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
