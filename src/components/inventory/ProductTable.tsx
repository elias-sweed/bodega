import type { ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'
import { StockBadge } from './StockBadge'

interface ProductTableProps {
  products: ProductosRow[]
}

export function ProductTable({ products }: ProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3 font-semibold">Producto</th>
            <th className="px-5 py-3 font-semibold">Código</th>
            <th className="px-5 py-3 font-semibold">Categoría</th>
            <th className="px-5 py-3 text-right font-semibold">Precio venta</th>
            <th className="px-5 py-3 text-right font-semibold">Costo</th>
            <th className="px-5 py-3 text-right font-semibold">Stock actual</th>
            <th className="px-5 py-3 text-right font-semibold">Stock mín.</th>
            <th className="px-5 py-3 text-right font-semibold">Estado</th>
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
                <td className="px-5 py-3 text-right text-slate-600">
                  {formatMoney(product.costo)}
                </td>
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
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}