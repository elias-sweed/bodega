import { useState } from 'react'
import { PackageMinus, PackagePlus, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import type { ProductosRow } from '../../types/database.types'

export interface StockAdjustPayload {
  stock: number
  motivo: string
  esRegalo: boolean
  /** id de la sesión activa (para el registro del movimiento) */
  usuarioId: string | null
}

interface StockAdjustModalProps {
  product: ProductosRow
  onClose: () => void
  onSubmit: (payload: StockAdjustPayload) => Promise<void>
}

const MOTIVOS_ENTRADA = ['Corrección de inventario'] as const
const MOTIVOS_SALIDA = ['Producto vencido', 'Producto dañado/roto', 'Consumo interno'] as const

const inputClass =
  'h-12 w-full rounded-2xl border border-line bg-surface px-4 text-lg font-bold text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-muted/70 focus:border-line-strong focus:bg-surface-2'
const labelClass =
  'mb-1.5 mt-4 block text-xs font-extrabold uppercase tracking-[0.16em] text-muted'

export function StockAdjustModal({ product, onClose, onSubmit }: StockAdjustModalProps) {
  const { user } = useAuth()
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
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
      await onSubmit({
        stock: value,
        motivo: motivo.trim(),
        esRegalo,
        usuarioId: user?.id ?? null,
      })
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
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#0b0420]/85 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="fade-up max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl"
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
              Inventario
            </p>
            <h2 id="ajustar-stock-title" className="text-xl font-black tracking-tighter text-ink">
              Ajustar stock
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-200 hover:bg-surface-3 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <p className="text-sm font-medium text-muted">
          <strong className="font-extrabold text-ink">{product.nombre}</strong> — stock
          actual: <span className="font-black tabular-nums text-ink">{product.stock_actual}</span>
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
            className="h-12 w-full cursor-pointer rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink outline-none backdrop-blur-xl transition-all duration-300 focus:border-line-strong [&>option]:bg-[#241b66] [&>option]:text-slate-100"
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
            className="h-12 w-full cursor-pointer rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink outline-none backdrop-blur-xl transition-all duration-300 focus:border-line-strong [&>option]:bg-[#241b66] [&>option]:text-slate-100"
          >
            {MOTIVOS_SALIDA.map((name) => (
              <option key={name} value={name}>
                {name} (−)
              </option>
            ))}
          </select>
        )}

        {delta !== 0 && (
          <p className="mt-3 flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted backdrop-blur-xl">
            {movementType === 'entrada' ? (
              <PackagePlus size={14} className="shrink-0 text-profit" aria-hidden="true" />
            ) : (
              <PackageMinus size={14} className="shrink-0 text-rose-600" aria-hidden="true" />
            )}
            <span>
              Movimiento de{' '}
              <span className={delta > 0 ? 'font-black text-profit' : 'font-black text-loss'}>
                {movementType} {Math.abs(delta)}
              </span>{' '}
              · {motivo} · queda en {parsed}.
            </span>
          </p>
        )}

        {movementType === 'entrada' && (
          <label
            htmlFor="es-regalo"
            className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-4 backdrop-blur-xl transition-all duration-300 has-[:checked]:border-emerald-200/50 has-[:checked]:bg-emerald-400/15"
          >
            <input
              id="es-regalo"
              type="checkbox"
              checked={esRegalo}
              onChange={(e) => setEsRegalo(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-emerald-400"
            />
            <span>
              <span className="block text-sm font-extrabold text-ink">
                Regalo / Bonificación
              </span>
              <span className="block text-xs font-medium text-muted">
                El ingreso se registra sin costo para el negocio (0.00).
              </span>
            </span>
          </label>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm font-bold text-loss"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-surface text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-12 flex-[2] rounded-2xl border border-sky-200/30 bg-sky-500 text-sm font-black text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {submitting ? 'Guardando…' : 'Ajustar stock'}
          </button>
        </div>
      </form>
    </div>
  )
}
