import type { ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'

interface ProductButtonProps {
  product: ProductosRow
  onClick: () => void
}

export function ProductButton({ product, onClick }: ProductButtonProps) {
  const agotado = product.stock_actual <= 0

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
      {agotado && (
        <span className="text-sm font-bold text-rose-600">Agotado</span>
      )}
    </button>
  )
}