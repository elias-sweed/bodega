import { useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { PackagePlus, ShoppingCart, X } from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'

export interface QuickPurchasePayload {
  cantidad: number
  costoTotal: number
  comprobante: string | null
}

interface QuickPurchaseModalProps {
  product: ProductosRow
  onClose: () => void
  onSubmit: (payload: QuickPurchasePayload) => Promise<void>
}

const inputClass =
  'h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-lg font-bold text-ink outline-none placeholder:text-muted/70 focus:border-amber-300/70 focus:bg-surface-3 focus:ring-4 focus:ring-amber-400/10'
const labelClass =
  'mb-1.5 mt-4 block text-xs font-extrabold uppercase tracking-[0.16em] text-muted'

export function QuickPurchaseModal({
  product,
  onClose,
  onSubmit,
}: QuickPurchaseModalProps) {
  const [cantidad, setCantidad] = useState('')
  const [costoTotal, setCostoTotal] = useState('')
  const [comprobante, setComprobante] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cantidadNum = cantidad.trim() === '' ? Number.NaN : Number(cantidad)
  const costoTotalNum = costoTotal.trim() === '' ? Number.NaN : Number(costoTotal)
  const cantidadValida = Number.isInteger(cantidadNum) && cantidadNum > 0
  const costoValido = Number.isFinite(costoTotalNum) && costoTotalNum >= 0
  const costoUnitario =
    cantidadValida && costoValido ? costoTotalNum / cantidadNum : null
  const stockResultante = cantidadValida ? product.stock_actual + cantidadNum : null
  const costoPendiente = product.costo <= 0

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting) return
    setError(null)

    if (!cantidadValida) {
      setError('Escribe cuántas unidades llegaron (por ejemplo, 24).')
      return
    }
    if (!costoValido) {
      setError('Escribe el costo total de la caja o paquete. Usa 0 si fue gratuito.')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        cantidad: cantidadNum,
        costoTotal: costoTotalNum,
        comprobante: comprobante.trim() || null,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la compra')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registrar-compra-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#080315]/90 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/15 bg-surface p-6 shadow-[0_30px_90px_-28px_rgba(0,0,0,0.95)]"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-300">
              Entrada de mercadería
            </p>
            <h2 id="registrar-compra-title" className="text-xl font-black tracking-tighter text-ink">
              Registrar compra
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-2xl border border-line bg-surface-2 px-4 py-3">
          <p className="text-sm font-extrabold text-ink">{product.nombre}</p>
          <p className="mt-1 text-sm font-semibold text-muted">
            Stock actual: <span className="font-black tabular-nums text-ink">{product.stock_actual}</span>
            {stockResultante !== null && (
              <span className="text-profit"> → quedará en {stockResultante}</span>
            )}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">
            Costo actual:{' '}
            <span className="font-black text-ink">
              {product.costo > 0 ? formatMoney(product.costo) : 'Pendiente'}
            </span>
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-medium leading-relaxed text-ink">
          {costoPendiente
            ? 'Primera compra con costo: el costo por unidad de esta compra establecerá el costo del producto y permitirá calcular el margen.'
            : 'Se sumarán las unidades y se recalculará el costo promedio del producto.'}
        </div>
        <p className="mt-2 text-xs font-medium text-muted">
          Usa esta opción cuando llega mercadería. Para una merma, daño o conteo físico, usa “Ajustar stock”.
        </p>

        <label htmlFor="cantidad-compra" className={labelClass}>
          ¿Cuántas unidades llegaron?
        </label>
        <input
          id="cantidad-compra"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={cantidad}
          onChange={(event) => setCantidad(event.target.value)}
          className={inputClass}
          placeholder="Ej. 24"
          autoFocus
        />

        <label htmlFor="costo-total-compra" className={labelClass}>
          ¿Cuánto costó toda la caja o paquete? (S/)
        </label>
        <input
          id="costo-total-compra"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={costoTotal}
          onChange={(event) => setCostoTotal(event.target.value)}
          className={inputClass}
          placeholder="Ej. 48.00"
        />

        {costoUnitario !== null && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
            <span className="text-sm font-extrabold text-ink">Costo por unidad</span>
            <strong className="text-lg font-black tabular-nums text-gold">
              {formatMoney(costoUnitario)}
            </strong>
          </div>
        )}

        <label htmlFor="comprobante-compra" className={labelClass}>
          Boleta o factura (opcional)
        </label>
        <input
          id="comprobante-compra"
          value={comprobante}
          onChange={(event) => setComprobante(event.target.value)}
          className={inputClass}
          placeholder="Si no tienes comprobante, déjalo vacío"
        />

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-sm font-bold text-loss"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-line bg-surface-2 text-sm font-extrabold text-ink transition-colors hover:bg-surface-3 active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 px-4 text-sm font-black text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <PackagePlus size={18} aria-hidden="true" /> : <ShoppingCart size={18} aria-hidden="true" />}
            {submitting ? 'Guardando…' : 'Guardar compra'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
