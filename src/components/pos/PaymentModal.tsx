import { useEffect, useMemo, useRef, useState } from 'react'
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-black text-slate-900">Cobrar venta</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={charging}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <span className="text-base font-semibold text-slate-600">Total a cobrar</span>
          <span className="text-4xl font-black tracking-tight text-slate-900">
            {formatMoney(total)}
          </span>
        </div>

        <div className="mt-5">
          <span className="mb-1 block text-sm font-semibold text-slate-600">
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
                className={`h-12 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${
                  metodoPago === metodo
                    ? 'bg-emerald-500 text-white shadow'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              className="mb-1 block text-sm font-semibold text-slate-600"
            >
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
              className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-2xl font-black text-slate-900 outline-none transition-colors placeholder:text-slate-300 focus:border-emerald-400"
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecibido(total)}
                disabled={charging}
                className="h-12 rounded-xl bg-emerald-500 text-sm font-bold text-white shadow transition-colors hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-40"
              >
                Completo ({formatMoney(total)})
              </button>
              <button
                type="button"
                onClick={() => setRecibido(0)}
                disabled={charging}
                className="h-12 rounded-xl bg-slate-100 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
              >
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
                  className="h-12 rounded-xl border-2 border-slate-200 text-base font-bold text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.98] disabled:opacity-40"
                >
                  S/ {monto}
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-600">Vuelto</span>
              <span
                className={`text-2xl font-black ${
                  vuelto >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatMoney(Math.max(vuelto, 0))}
              </span>
            </div>
            {vuelto < 0 && (
              <p className="mt-1 text-xs font-semibold text-rose-600">
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
          className="mt-6 h-14 w-full rounded-2xl bg-emerald-500 text-xl font-black tracking-widest text-white shadow-lg transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {charging ? 'PROCESANDO…' : 'CONFIRMAR COBRO'}
        </button>
      </div>
    </div>
  )
}