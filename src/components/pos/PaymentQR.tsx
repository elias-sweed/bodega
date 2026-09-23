import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode } from 'lucide-react'
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
        <p className="mb-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
          Pago por {method}
        </p>
        <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-100 px-4 text-center backdrop-blur-xl">
          <p className="text-sm font-bold text-amber-700">
            Tu código QR de {method} aparecerá aquí.
            <span className="mt-1 block text-xs font-medium text-amber-700/70">
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
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">
        <QrCode size={14} aria-hidden="true" />
        Pago por {method}
      </p>
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 backdrop-blur-xl">
        {qrError ? (
          <p className="py-10 text-sm font-bold text-rose-700">
            No se pudo generar el QR. Reinicia la página.
          </p>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt={`Código QR de ${method}`}
            className="h-48 w-48 rounded-2xl border border-line bg-white p-2 shadow-lg"
          />
        ) : (
          <span
            className="skeleton-shimmer h-48 w-48 rounded-2xl"
            aria-hidden="true"
          />
        )}
        <p className="text-lg font-black tracking-wide text-ink">{number}</p>
        <p className="text-xs font-medium text-muted">
          El cliente escanea, paga y confirmas abajo.
        </p>
      </div>
    </div>
  )
}
