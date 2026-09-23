import { useEffect } from 'react'
import { CheckCircle2, MessageCircle, Printer, X } from 'lucide-react'
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

function esc(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ??
      c,
  )
}

function printReceipt(sale: LastSale): void {
  const win = window.open('', '_blank', 'width=400,height=650')
  if (!win) return
  const time = new Date(sale.fecha).toLocaleString('es-PE')
  const rows = sale.items
    .map(
      (item) => `<tr>
        <td>${item.quantity} x ${esc(item.product.nombre)}</td>
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
    <div
      className="fade-in fixed inset-0 z-30 flex items-center justify-center bg-[#0b0420]/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="fade-up max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Venta registrada"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-profit/40 bg-profit/15 text-profit">
              <CheckCircle2 size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tighter text-ink">
                Venta registrada
              </h2>
              <p className="text-xs font-semibold text-muted">
                Recibo {shortId(sale.venta_id)} · {sale.metodo_pago}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-200 hover:bg-surface-3 hover:text-ink"
            aria-label="Cerrar"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 font-mono text-sm text-slate-800 shadow-inner">
          <p className="mb-1 flex items-center justify-between gap-2">
            <span className="font-bold">Bodega POS</span>
          </p>
          <p className="text-xs text-slate-500">
            Recibo <strong>{shortId(sale.venta_id)}</strong> · {sale.metodo_pago} ·{' '}
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

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => printReceipt(sale)}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.99]"
          >
            <Printer size={16} aria-hidden="true" />
            Imprimir recibo
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200/30 bg-emerald-500 text-sm font-black text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99]"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Enviar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
