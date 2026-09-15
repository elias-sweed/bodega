import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getPaymentNumber, type MetodoBilletera } from '../../utils/paymentConfig'

interface PaymentQRProps {
  method: MetodoBilletera
}

export function PaymentQR({ method }: PaymentQRProps) {
  const number = getPaymentNumber(method)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)

  useEffect(() => {
    if (!number) return
    let cancelled = false
    void QRCode.toDataURL(number, { width: 260, margin: 1 })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrError(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [number])

  if (!number) {
    return (
      <div className="mt-5">
        <p className="mb-1 text-sm font-semibold text-slate-600">Pago por {method}</p>
        <div className="flex h-44 items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 text-center">
          <p className="text-sm font-semibold text-amber-700">
            Tu código QR de {method} aparecerá aquí.
            <span className="mt-1 block font-normal">
              Falta configurar el número en las variables del proyecto
              (VITE_{method.toUpperCase()}_NUMBER).
            </span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5">
      <p className="mb-1 text-sm font-semibold text-slate-600">Pago por {method}</p>
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-slate-50 p-4">
        {qrError ? (
          <p className="py-10 text-sm font-semibold text-rose-600">
            No se pudo generar el QR. Reinicia la página.
          </p>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt={`Código QR de ${method}`}
            className="h-48 w-48 rounded-2xl bg-white p-2 shadow-sm"
          />
        ) : (
          <span
            className="h-48 w-48 animate-pulse rounded-2xl bg-slate-200"
            aria-hidden="true"
          />
        )}
        <p className="text-lg font-black tracking-wide text-slate-900">{number}</p>
        <p className="text-xs text-slate-400">
          El cliente escanea, paga y confirmas abajo.
        </p>
      </div>
    </div>
  )
}