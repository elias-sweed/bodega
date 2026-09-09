import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ProductosRow } from '../../types/database.types'

interface StockAdjustModalProps {
  product: ProductosRow
  onClose: () => void
  onSubmit: (newStock: number) => Promise<void>
}

const inputClass =
  'h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400'

export function StockAdjustModal({ product, onClose, onSubmit }: StockAdjustModalProps) {
  const [stock, setStock] = useState(String(product.stock_actual))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)
    const value = Number(stock)
    if (!Number.isFinite(value) || value < 0) {
      setError('Ingresa una cantidad válida (0 o más).')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(value)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo ajustar el stock')
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ajustar-stock-title"
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="ajustar-stock-title" className="text-2xl font-bold text-slate-900">
            Ajustar stock
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-bold text-slate-500 transition-colors hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-slate-500">
          <strong className="text-slate-800">{product.nombre}</strong> — stock
          actual: {product.stock_actual}
        </p>

        <label htmlFor="nuevo-stock" className="mt-4 mb-1 block text-sm font-semibold text-slate-600">
          Nuevo stock
        </label>
        <input
          id="nuevo-stock"
          required
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className={inputClass}
          placeholder="0"
        />

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-rose-100 px-4 py-2 font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-14 flex-1 rounded-2xl bg-slate-100 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-14 flex-[2] rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {submitting ? 'Guardando…' : 'Ajustar stock'}
          </button>
        </div>
      </form>
    </div>
  )
}