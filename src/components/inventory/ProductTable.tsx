import { useMemo, useState } from 'react'
import { Search, Tags, TrendingUp } from 'lucide-react'
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

function marginPercent(product: ProductosRow): number | null {
  if (product.precio_venta <= 0) return null
  return ((product.precio_venta - product.costo) / product.precio_venta) * 100
}

function marginClass(margin: number): string {
  if (margin < 0) return 'bg-rose-100 text-rose-700'
  if (margin < 20) return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

export function ProductTable({
  products,
  isAdmin = false,
  onEdit,
  onAdjustStock,
  onDelete,
}: ProductTableProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('todas')

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.categoria))).sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesSearch =
        query === '' ||
        product.nombre.toLowerCase().includes(query) ||
        (product.codigo_barras ?? '').toLowerCase().includes(query)
      const matchesCategory = category === 'todas' || product.categoria === category
      return matchesSearch && matchesCategory
    })
  }, [products, search, category])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block w-full max-w-xs">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o código…"
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400"
          />
        </label>

        <label className="relative block">
          <Tags
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 cursor-pointer rounded-xl border-2 border-slate-200 bg-white pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-sky-400"
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {filteredProducts.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-400">
            No se encontraron productos con los filtros aplicados.
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Producto</th>
                <th className="px-5 py-3 font-semibold">Código</th>
                <th className="px-5 py-3 font-semibold">Categoría</th>
                <th className="px-5 py-3 text-right font-semibold">Precio venta</th>
                <th className="px-5 py-3 text-right font-semibold">Margen</th>
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
              {filteredProducts.map((product) => {
                const lowStock = product.stock_actual <= product.stock_minimo
                const margin = marginPercent(product)
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
                    <td className="px-5 py-3 text-right">
                      {margin === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${marginClass(margin)}`}
                          title="Margen de ganancia sobre el precio de venta"
                        >
                          <TrendingUp
                            size={12}
                            strokeWidth={2.5}
                            aria-hidden="true"
                          />
                          {Math.round(margin)}%
                        </span>
                      )}
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
        )}
      </div>
    </div>
  )
}