import { useEffect } from 'react'
import type { CartItem } from '../../types'
import { formatMoney } from '../../utils/format'

export type LastSale = {
  venta_id: string
  total: number
  fecha: string
  items: CartItem[]
  metodo_pago: string
}

function shortId(ventaId: string): string {
  return ventaId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

function printReceipt(sale: LastSale): void {
  const win = window.open('', '_blank', 'width=400,height=650')
  if (!win) return
  const time = new Date(sale.fecha).toLocaleString('es-PE')
  const rows = sale.items
    .map(
      (item) => `<tr>
        <td>${item.quantity} x ${item.product.nombre}</td>
        <td style="text-align:right">${formatMoney(
          item.product.precio_venta * item.quantity,
        )}</td>
      </tr>`,
    )
    .join('')

  win.document.open()
  win.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${shortId(sale.venta_id)}</title>
<style>
  body { font-family: 'Courier New', monospace; width: 300px; margin: 24px auto; color: #0f172a; }
  .center { text-align: center; }
  h1 { font-size: 18px; margin: 0; }
  hr { border: 0; border-top: 1px dashed #64748b; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; font-size: 13px; }
  .total { font-size: 16px; font-weight: bold; }
  .muted { color: #64748b; font-size: 12px; margin: 2px 0; }
</style>
</head>
<body>
  <div class="center">
    <h1>BODEGA POS</h1>
    <p class="muted">Av. Principal 123 - Lima</p>
  </div>
  <hr />
  <p class="muted">Recibo: ${shortId(sale.venta_id)}</p>
  <p class="muted">Pago: ${sale.metodo_pago}</p>
  <p class="muted">Fecha: ${time}</p>
  <hr />
  <table>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <hr />
  <table>
    <tr><td class="total">TOTAL</td><td class="total" style="text-align:right">${formatMoney(
      sale.total,
    )}</td></tr>
  </table>
  <p class="center muted">Gracias por su compra</p>
</body>
</html>`)
  win.document.close()
  win.focus()
  window.setTimeout(() => win.print(), 250)
}

function whatsappMessage(sale: LastSale): string {
  const lines = [
    '\u{1F6D2} BODEGA POS',
    `Recibo: ${shortId(sale.venta_id)}`,
    `Pago: ${sale.metodo_pago}`,
    `Fecha: ${new Date(sale.fecha).toLocaleString('es-PE')}`,
    '---------------------------',
    ...sale.items.map(
      (item) =>
        `${item.quantity} x ${item.product.nombre} - ${formatMoney(
          item.product.precio_venta * item.quantity,
        )}`,
    ),
    '---------------------------',
    `TOTAL: ${formatMoney(sale.total)}`,
  ]
  lines.push('Gracias por su compra')
  return lines.join('\n')
}

interface ReceiptModalProps {
  sale: LastSale
  onClose: () => void
}

export function ReceiptModal({ sale, onClose }: ReceiptModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-black text-slate-900">Venta registrada</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 font-mono text-sm text-slate-800">
          <p className="mb-1 flex items-center justify-between gap-2">
            <span className="font-bold">Bodega POS</span>
          </p>
          <p className="text-xs text-slate-500">
            Recibo <strong>{shortId(sale.venta_id)}</strong> ·{' '}
            {sale.metodo_pago} ·{' '}
            {new Date(sale.fecha).toLocaleDateString('es-PE')}{' '}
            {new Date(sale.fecha).toLocaleTimeString('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <ul className="mt-3 divide-y divide-slate-200">
            {sale.items.map((item) => (
              <li
                key={item.product.id}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <span>
                  {item.quantity} x {item.product.nombre}
                </span>
                <span className="shrink-0 font-semibold">
                  {formatMoney(item.product.precio_venta * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-baseline justify-between border-t-2 border-dashed border-slate-300 pt-3">
            <span className="text-base font-black">TOTAL</span>
            <span className="text-xl font-black">{formatMoney(sale.total)}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => printReceipt(sale)}
            className="h-12 w-full rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 active:scale-[0.99]"
          >
            🖨️ Imprimir recibo
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(whatsappMessage(sale))}`,
                '_blank',
                'noopener,noreferrer',
              )
            }
            className="h-12 w-full rounded-xl bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-600 active:scale-[0.99]"
          >
            📲 Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}