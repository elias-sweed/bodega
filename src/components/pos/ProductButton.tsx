import type { ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'

interface ProductButtonProps {
  product: ProductosRow
  onClick: () => void
}

function stockLevel(stockActual: number, stockMinimo: number): number {
  const reference = Math.max(stockMinimo * 2, 10)
  return Math.min(stockActual / reference, 1)
}

function stockStyle(stockActual: number, stockMinimo: number): string {
  if (stockActual <= 0) return 'bg-rose-500'
  if (stockActual <= stockMinimo) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function ProductButton({ product, onClick }: ProductButtonProps) {
  const agotado = product.stock_actual <= 0
  const width = Math.round(stockLevel(product.stock_actual, product.stock_minimo) * 100)

  return (
    <button
      type="button"
      disabled={agotado}
      onClick={onClick}
      className={`flex h-28 flex-col items-start justify-center gap-1 rounded-2xl bg-white px-5 shadow-sm transition-all hover:shadow-md active:scale-95 ${
        agotado
          ? 'cursor-not-allowed bg-slate-100 opacity-60 shadow-none'
          : ''
      }`}
    >
      <span className="line-clamp-2 text-left text-lg font-semibold leading-tight text-slate-800">
        {product.nombre}
      </span>
      <span className="text-xl font-bold text-sky-600">
        {formatMoney(product.precio_venta)}
      </span>

      <div
        className="flex w-full items-center gap-2"
        title={`Quedan ${product.stock_actual} unidades`}
      >
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              agotado
                ? 'w-0'
                : stockStyle(product.stock_actual, product.stock_minimo)
            }`}
            style={{ width: `${agotado ? 0 : width}%` }}
          />
        </div>
        <span
          className={`shrink-0 text-xs font-black tabular-nums ${
            agotado
              ? 'text-rose-600'
              : product.stock_actual <= product.stock_minimo
                ? 'text-amber-600'
                : 'text-emerald-600'
          }`}
        >
          {agotado ? 'Agotado' : `${product.stock_actual}`}
        </span>
      </div>
    </button>
  )
}