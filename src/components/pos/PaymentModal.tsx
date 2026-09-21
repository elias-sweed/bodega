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
      className="fade-in fixed inset-0 z-30 flex items-center justify-center bg-[#150834]/70 p-4 backdrop-blur-md"
      onClick={() => {
        if (!charging) onCancel()
      }}
    >
      <div
        className="fade-up max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-[28px] border border-white/20 bg-gradient-to-br from-[#3b1d8f]/95 via-[#2a1568]/95 to-[#1a0b3d]/95 p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cobrar venta"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/55">
              Punto de venta
            </p>
            <h2 className="mt-0.5 text-xl font-black tracking-tighter text-white">
              Cobrar venta
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={charging}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 transition-all duration-200 hover:bg-white/20 hover:text-white disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/60">
            <Wallet size={14} aria-hidden="true" />
            Total a cobrar
          </span>
          <span className="text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            {formatMoney(total)}
          </span>
        </div>

        <div className="mt-5">
          <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-[0.16em] text-white/60">
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
                className={`h-12 rounded-2xl text-sm font-black tracking-tight transition-all duration-300 active:scale-[0.97] disabled:opacity-40 ${
                  metodoPago === metodo
                    ? 'border border-emerald-200/40 bg-gradient-to-br from-emerald-400/90 to-emerald-600/90 text-white shadow-[0_12px_30px_-12px_rgba(16,185,129,0.8)]'
                    : 'border border-white/15 bg-white/10 text-white/75 backdrop-blur-xl hover:bg-white/20 hover:text-white'
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
              className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-white/60"
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
              className="h-14 w-full rounded-2xl border border-white/25 bg-white/10 px-4 text-2xl font-black tracking-tight text-white outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-white/30 focus:border-emerald-300/60 focus:bg-white/15"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecibido(total)}
                disabled={charging}
                className="h-12 rounded-2xl border border-emerald-200/30 bg-emerald-400/25 px-2 text-xs font-black text-emerald-50 backdrop-blur-xl transition-all duration-300 hover:bg-emerald-400/40 active:scale-[0.98] disabled:opacity-40"
              >
                Completo ({formatMoney(total)})
              </button>
              <button
                type="button"
                onClick={() => setRecibido(0)}
                disabled={charging}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold text-white/80 backdrop-blur-xl transition-all duration-300 hover:bg-white/20 active:scale-[0.98] disabled:opacity-40"
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
                  className="h-11 rounded-2xl border border-white/20 bg-white/10 text-sm font-black text-white backdrop-blur-xl transition-all duration-200 hover:border-emerald-200/40 hover:bg-emerald-400/25 active:scale-[0.97] disabled:opacity-40"
                >
                  S/ {monto}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                Vuelto
              </span>
              <span
                className={`text-2xl font-black tracking-tight ${
                  vuelto >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {formatMoney(Math.max(vuelto, 0))}
              </span>
            </div>
            {vuelto < 0 && (
              <p className="mt-2 text-xs font-bold text-rose-200">
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
          className="mt-6 h-14 w-full rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-400/90 to-emerald-600/90 text-lg font-black tracking-[0.2em] text-white shadow-[0_16px_40px_-14px_rgba(16,185,129,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none disabled:hover:translate-y-0"
        >
          {charging ? 'PROCESANDO…' : 'CONFIRMAR COBRO'}
        </button>
      </div>
    </div>
  )
}
