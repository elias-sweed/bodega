import { Trash2 } from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'

interface CompraItem {
  producto: ProductosRow
  cantidad: string
  costoTotal: string
}

interface PurchaseItemsTableProps {
  items: CompraItem[]
  onUpdateItem: (productoId: string, field: 'cantidad' | 'costoTotal', value: string) => void
  onRemoveItem: (productoId: string) => void
  totalCompra: number
}

/**
 * Componente que renderiza la tabla de ítems en el formulario de compra.
 * Muestra producto, cantidad, costo total, costo unitario y botón para quitar.
 */
export function PurchaseItemsTable({
  items,
  onUpdateItem,
  onRemoveItem,
  totalCompra,
}: PurchaseItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface-sub px-5 py-10 text-center">
        <p className="text-sm font-extrabold tracking-tight text-ink">
          Aquí aparecerá lo que estás recibiendo
        </p>
        <p className="mt-1 text-xs font-medium text-muted">
          Escribe arriba el nombre del producto y tócalo para agregarlo a la lista.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface-sub backdrop-blur-xl">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-surface text-[11px] font-extrabold uppercase tracking-widest text-muted">
            <th className="px-4 py-3.5">Producto</th>
            <th className="w-32 px-4 py-3.5">¿Cuántas unidades?</th>
            <th className="w-44 px-4 py-3.5">¿Costo total? (S/)</th>
            <th className="px-4 py-3.5">Cada uno sale a</th>
            <th className="w-16 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const cantidad = Number(item.cantidad)
            const costo = Number(item.costoTotal)
            const costoUnitario =
              Number.isInteger(cantidad) &&
              cantidad >= 1 &&
              Number.isFinite(costo) &&
              costo >= 0
                ? costo / cantidad
                : null
            return (
              <tr
                key={item.producto.id}
                className="fade-in border-b border-line transition-colors odd:bg-surface-sub last:border-none hover:bg-surface"
              >
                <td className="px-4 py-3.5">
                  <p className="text-base font-extrabold tracking-tight text-ink">
                    {item.producto.nombre}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold tabular-nums text-muted">
                    Hay {item.producto.stock_actual}
                    {Number.isInteger(Number(item.cantidad)) &&
                      Number(item.cantidad) >= 1 && (
                        <span className="font-black text-profit">
                          {' '}
                          → quedará en {item.producto.stock_actual + Number(item.cantidad)}
                        </span>
                      )}
                  </p>
                </td>
                <td className="px-4 py-3.5">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={item.cantidad}
                    onChange={(e) =>
                      onUpdateItem(item.producto.id, 'cantidad', e.target.value)
                    }
                    aria-label={`Unidades que llegaron de ${item.producto.nombre}`}
                    className="h-11 w-full rounded-xl border-2 border-line-strong bg-surface-2 px-3 text-base font-black tabular-nums text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:font-semibold placeholder:text-muted/70 focus:border-emerald-300/70 focus:bg-surface-3"
                    placeholder="Ej. 24"
                  />
                </td>
                <td className="px-4 py-3.5">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={item.costoTotal}
                    onChange={(e) =>
                      onUpdateItem(item.producto.id, 'costoTotal', e.target.value)
                    }
                    aria-label={`Costo total pagado por ${item.producto.nombre}`}
                    className="h-11 w-full rounded-xl border-2 border-line-strong bg-surface-2 px-3 text-base font-black tabular-nums text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:font-semibold placeholder:text-muted/70 focus:border-emerald-300/70 focus:bg-surface-3"
                    placeholder="Ej. 48.00"
                  />
                </td>
                <td className="px-4 py-3.5">
                  {costoUnitario === null
                    ? <span className="text-sm font-bold text-muted">—</span>
                    : (
                      <span className="inline-block rounded-full border border-profit/40 bg-profit/15 px-3 py-1.5 text-sm font-black tabular-nums text-profit">
                        {formatMoney(costoUnitario)}
                      </span>
                    )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.producto.id)}
                    title="Quitar de la compra"
                    aria-label={`Quitar ${item.producto.nombre} de la compra`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-400/15 text-loss transition-all duration-200 hover:bg-rose-200/60 active:scale-90"
                  >
                    <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-profit/40 bg-profit/15">
            <td colSpan={2} className="px-4 py-4 text-right text-sm font-bold uppercase tracking-widest text-muted">
              Total de la compra
            </td>
            <td className="px-4 py-4 text-xl font-black tracking-tight text-ink">
              {formatMoney(totalCompra)}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
