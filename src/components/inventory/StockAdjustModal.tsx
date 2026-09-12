import { useState } from 'react'
import type { FormEvent } from 'react'
import { PackageMinus, PackagePlus } from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'

export interface StockAdjustPayload {
  stock: number
  motivo: string
  esRegalo: boolean
}

interface StockAdjustModalProps {
  product: ProductosRow
  onClose: () => void
  onSubmit: (payload: StockAdjustPayload) => Promise<void>
}

const MOTIVOS_ENTRADA = ['Corrección de inventario'] as const
const MOTIVOS_SALIDA = ['Producto vencido', 'Producto dañado/roto', 'Consumo interno'] as const

const inputClass =
  'h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400'
const labelClass = 'mt-4 mb-1 block text-sm font-semibold text-slate-600'

export function StockAdjustModal({ product, onClose, onSubmit }: StockAdjustModalProps) {
  const [stock, setStock] = useState(String(product.stock_actual))
  const [motivo, setMotivo] = useState<string>(MOTIVOS_ENTRADA[0])
  const [esRegalo, setEsRegalo] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = Number(stock)
  const hasValue = stock !== '' && Number.isFinite(parsed)
  const delta = hasValue ? parsed - product.stock_actual : 0
  const movementType = delta > 0 ? 'entrada' : delta < 0 ? 'salida' : null

  const handleStockChange = (value: string): void => {
    setStock(value)
    const numeric = value === '' ? Number.NaN : Number(value)
    const nextDelta = Number.isFinite(numeric) ? numeric - product.stock_actual : 0
    if (nextDelta > 0) {
      setMotivo(MOTIVOS_ENTRADA[0])
    } else if (nextDelta < 0) {
      setMotivo(MOTIVOS_SALIDA[0])
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)
    const value = Number(stock)
    if (!Number.isFinite(value) || value < 0) {
      setError('Ingresa una cantidad válida (0 o más).')
      return
    }
    if (delta === 0) {
      setError('El nuevo stock es igual al actual. Cambia la cantidad para ajustar.')
      return
    }
    if (!motivo.trim()) {
      setError('Selecciona un motivo para el ajuste.')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({ stock: value, motivo: motivo.trim(), esRegalo })
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

        <label htmlFor="nuevo-stock" className={labelClass}>
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
          onChange={(e) => handleStockChange(e.target.value)}
          className={inputClass}
          placeholder="0"
        />

        {movementType && (
          <label htmlFor="motivo-ajuste" className={labelClass}>
            Motivo del ajuste
          </label>
        )}
        {movementType === 'entrada' && (
          <select
            id="motivo-ajuste"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="h-12 w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 outline-none transition-colors focus:border-sky-400"
          >
            {MOTIVOS_ENTRADA.map((name) => (
              <option key={name} value={name}>
                {name} (+)
              </option>
            ))}
          </select>
        )}
        {movementType === 'salida' && (
          <select
            id="motivo-ajuste"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="h-12 w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 outline-none transition-colors focus:border-sky-400"
          >
            {MOTIVOS_SALIDA.map((name) => (
              <option key={name} value={name}>
                {name} (−)
              </option>
            ))}
          </select>
        )}

        {delta !== 0 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            {movementType === 'entrada' ? (
              <PackagePlus size={14} className="shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
              <PackageMinus size={14} className="shrink-0 text-rose-600" aria-hidden="true" />
            )}
            Se registrará un movimiento de{' '}
            <span className={delta > 0 ? 'font-bold text-emerald-600' : 'font-bold text-rose-600'}>
              {movementType} {Math.abs(delta)}
            </span>{' '}
            · {motivo} · queda en {parsed}.
          </p>
        )}

        {movementType === 'entrada' && (
          <label
            htmlFor="es-regalo"
            className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 transition-colors has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50"
          >
            <input
              id="es-regalo"
              type="checkbox"
              checked={esRegalo}
              onChange={(e) => setEsRegalo(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-emerald-500"
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">
                Regalo / Bonificación
              </span>
              <span className="block text-xs text-slate-500">
                El ingreso se registra sin costo para el negocio (0.00).
              </span>
            </span>
          </label>
        )}

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