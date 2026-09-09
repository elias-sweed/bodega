import type { ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'
import { StockBadge } from './StockBadge'

interface ProductTableProps {
  products: ProductosRow[]
  isAdmin?: boolean
  onEdit?: (product: ProductosRow) => void
  onAdjustStock?: (product: ProductosRow) => void
  onDelete?: (product: ProductosRow) => void
}

export function ProductTable({
  products,
  isAdmin = false,
  onEdit,
  onAdjustStock,
  onDelete,
}: ProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3 font-semibold">Producto</th>
            <th className="px-5 py-3 font-semibold">Código</th>
            <th className="px-5 py-3 font-semibold">Categoría</th>
            <th className="px-5 py-3 text-right font-semibold">Precio venta</th>
            {isAdmin && (
              <th className="px-5 py-3 text-right font-semibold">Costo</th>
            )}
            <th className="px-5 py-3 text-right font-semibold">Stock actual</th>
            <th className="px-5 py-3 text-right font-semibold">Stock mín.</th>
            <th className="px-5 py-3 text-right font-semibold">Estado</th>
            {isAdmin && (
              <th className="px-5 py-3 text-right font-semibold">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const lowStock = product.stock_actual <= product.stock_minimo
            return (
              <tr
                key={product.id}
                className={`border-b border-slate-100 last:border-none ${
                  lowStock ? 'bg-rose-50/60' : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-5 py-3 font-semibold text-slate-800">
                  {product.nombre}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-slate-500">
                  {product.codigo_barras ?? '—'}
                </td>
                <td className="px-5 py-3 text-slate-600">{product.categoria}</td>
                <td className="px-5 py-3 text-right font-medium text-slate-800">
                  {formatMoney(product.precio_venta)}
                </td>
                {isAdmin && (
                  <td className="px-5 py-3 text-right text-slate-600">
                    {formatMoney(product.costo)}
                  </td>
                )}
                <td
                  className={`px-5 py-3 text-right font-bold ${
                    lowStock ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {product.stock_actual}
                </td>
                <td className="px-5 py-3 text-right text-slate-500">
                  {product.stock_minimo}
                </td>
                <td className="px-5 py-3 text-right">
                  <StockBadge
                    stockActual={product.stock_actual}
                    stockMinimo={product.stock_minimo}
                  />
                </td>
                {isAdmin && (
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit?.(product)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-200"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onAdjustStock?.(product)}
                        className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-200"
                      >
                        Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete?.(product)}
                        className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-200"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}