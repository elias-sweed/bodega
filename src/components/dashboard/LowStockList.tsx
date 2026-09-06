import type { ProductosRow } from '../../types/database.types'

interface LowStockListProps {
  products: ProductosRow[]
}

export function LowStockList({ products }: LowStockListProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl bg-emerald-50 p-8 text-center shadow-sm">
        <p className="text-lg font-bold text-emerald-700">Todo en orden</p>
        <p className="text-sm text-emerald-600">
          Ningún producto por agotarse por ahora.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {products.map((product) => {
        const agotado = product.stock_actual <= 0
        return (
          <li
            key={product.id}
            className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 shadow-sm ${
              agotado ? 'bg-rose-50' : 'bg-amber-50'
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-800">
                {product.nombre}
              </p>
              <p className="text-sm text-slate-500">{product.categoria}</p>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                  agotado
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {agotado ? 'Agotado' : 'Por agotarse'}
              </span>
              <p
                className={`mt-1 text-sm font-bold ${
                  agotado ? 'text-rose-700' : 'text-amber-700'
                }`}
              >
                {product.stock_actual} en bodega · mín {product.stock_minimo}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}