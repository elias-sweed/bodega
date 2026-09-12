import { useState } from 'react'
import { Trash2 } from 'lucide-react'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <Trash2 size={22} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <h2
            id="confirmar-eliminar-title"
            className="text-xl font-bold text-slate-900"
          >
            Eliminar producto
          </h2>
        </div>

        <p className="mt-4 text-slate-600">
          ¿Estás seguro de que deseas eliminar{' '}
          <strong className="text-slate-900">{product.nombre}</strong>?
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Se quitará del catálogo y de futuras ventas.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-rose-100 px-4 py-2 font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="h-11 rounded-2xl border-2 border-slate-200 px-5 text-base font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="h-11 rounded-2xl bg-rose-600 px-6 text-base font-bold text-white shadow-lg transition-all hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-rose-300 disabled:shadow-none"
          >
            {submitting ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}