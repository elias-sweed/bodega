import { useEffect, useMemo, useRef, useState } from 'react'
import { Banknote, Eraser, Wallet, X } from 'lucide-react'
import { formatMoney } from '../../utils/format'
import { METODOS_PAGO, type MetodoPago } from './metodosPago'
import { PaymentQR } from './PaymentQR'

interface PaymentModalProps {
  total: number
  metodoPago: MetodoPago
  charging: boolean
  onMetodoPagoChange: (metodo: MetodoPago) => void
  onConfirm: () => void
  onCancel: () => void
}

const BILLETE_OPCIONES = [3, 5, 10, 20, 50, 100]

export function PaymentModal({
  total,
  metodoPago,
  charging,
  onMetodoPagoChange,
  onConfirm,
  onCancel,
}: PaymentModalProps) {
  const [recibidoRaw, setRecibidoRaw] = useState('')
  const efectivoInput = useRef<HTMLInputElement | null>(null)

  const recibido = useMemo(() => {
    const value = Number(recibidoRaw.replace(',', '.'))
    return Number.isFinite(value) ? value : 0
  }, [recibidoRaw])

  const vuelto = recibido - total
  const necesitaEfectivo = metodoPago === 'Efectivo'
  const efectivoValido = !necesitaEfectivo || recibido >= total
  const canCharge = !charging && total > 0 && efectivoValido

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onCancel()
      }
      if (event.key === 'Enter') {
        const target = event.target as HTMLElement | null
        if (target?.tagName === 'INPUT') return
        if (canCharge) {
          onConfirm()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [canCharge, onCancel, onConfirm])

  const setRecibido = (value: number): void => {
    setRecibidoRaw(String(Math.round(value * 100) / 100))
  }

  const agregarAlRecibido = (monto: number): void => {
    setRecibido(recibido + monto)
  }

  const selectMetodo = (metodo: MetodoPago): void => {
    onMetodoPagoChange(metodo)
    setRecibidoRaw('')
    window.setTimeout(() => efectivoInput.current?.focus(), 0)
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#080315]/90 p-4"
      onClick={() => {
        if (!charging) onCancel()
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-[28px] border border-white/15 bg-surface p-6 shadow-[0_30px_90px_-28px_rgba(0,0,0,0.95)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cobrar venta"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-300">
              Punto de venta
            </p>
            <h2 className="mt-0.5 text-xl font-black tracking-tighter text-ink">
              Cobrar venta
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={charging}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-muted transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 rounded-2xl border border-amber-300/25 bg-surface-2 px-4 py-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted">
            <Wallet size={14} aria-hidden="true" />
            Total a cobrar
          </span>
          <span className="text-3xl font-black tracking-tighter text-amber-200">
            {formatMoney(total)}
          </span>
        </div>

        <div className="mt-5">
          <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
            Método de pago
          </span>
          <div className="grid grid-cols-3 gap-2">
            {METODOS_PAGO.map((metodo) => (
              <button
                key={metodo}
                type="button"
                onClick={() => selectMetodo(metodo)}
                aria-pressed={metodoPago === metodo}
                disabled={charging}
                className={`h-12 rounded-2xl text-sm font-black tracking-tight transition-colors active:scale-[0.97] disabled:opacity-40 ${
                  metodoPago === metodo
                    ? 'border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 text-slate-900 shadow-sm'
                    : 'border border-line bg-surface-2 text-muted hover:bg-surface-3 hover:text-ink'
                }`}
              >
                {metodo}
              </button>
            ))}
          </div>
        </div>

        {necesitaEfectivo ? (
          <div className="mt-5">
            <label
              htmlFor="recibido"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-muted"
            >
              <Banknote size={14} aria-hidden="true" />
              Pagó con (S/)
            </label>
            <input
              ref={efectivoInput}
              id="recibido"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              autoFocus
              value={recibidoRaw}
              onChange={(e) => setRecibidoRaw(e.target.value)}
              placeholder="0.00"
              className="h-14 w-full rounded-2xl border border-line bg-surface-2 px-4 text-2xl font-black tracking-tight text-ink outline-none placeholder:text-muted/70 focus:border-amber-300/70 focus:bg-surface-3 focus:ring-4 focus:ring-amber-400/10"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecibido(total)}
                disabled={charging}
                className="h-12 rounded-2xl border border-amber-300/40 bg-amber-400/15 px-2 text-xs font-black text-amber-200 transition-colors hover:bg-amber-400/25 active:scale-[0.98] disabled:opacity-40"
              >
                Completo ({formatMoney(total)})
              </button>
              <button
                type="button"
                onClick={() => setRecibido(0)}
                disabled={charging}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface-2 text-sm font-bold text-ink transition-colors hover:bg-surface-3 active:scale-[0.98] disabled:opacity-40"
              >
                <Eraser size={15} aria-hidden="true" />
                Borrar
              </button>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              {BILLETE_OPCIONES.map((monto) => (
                <button
                  key={monto}
                  type="button"
                  onClick={() => agregarAlRecibido(monto)}
                  disabled={charging}
                  className="h-11 rounded-2xl border border-line bg-surface-2 text-sm font-black text-ink transition-colors hover:border-amber-300/40 hover:bg-amber-400/15 active:scale-[0.97] disabled:opacity-40"
                >
                  S/ {monto}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface-2 px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted">
                Vuelto
              </span>
              <span
                className={`text-2xl font-black tracking-tight ${
                  vuelto >= 0 ? 'text-profit' : 'text-loss'
                }`}
              >
                {formatMoney(Math.max(vuelto, 0))}
              </span>
            </div>
            {vuelto < 0 && (
              <p className="mt-2 text-xs font-bold text-loss">
                Falta {formatMoney(-vuelto)} para completar el pago.
              </p>
            )}
          </div>
        ) : (
          <PaymentQR key={metodoPago} method={metodoPago} />
        )}

        <button
          type="button"
          disabled={!canCharge}
          onClick={onConfirm}
          className="mt-6 h-14 w-full rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 text-lg font-black tracking-[0.2em] text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
        >
          {charging ? 'PROCESANDO…' : 'CONFIRMAR COBRO'}
        </button>
      </div>
    </div>
  )
}
