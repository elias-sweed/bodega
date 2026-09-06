import type { Product } from '../../types'
import { formatMoney } from '../../utils/format'

interface ProductButtonProps {
  product: Product
  onClick: () => void
}

export function ProductButton({ product, onClick }: ProductButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-28 flex-col items-start justify-center gap-1 rounded-2xl bg-white px-5 shadow-sm transition-all hover:shadow-md active:scale-95"
    >
      <span className="line-clamp-2 text-left text-lg font-semibold leading-tight text-slate-800">
        {product.name}
      </span>
      <span className="text-xl font-bold text-sky-600">
        {formatMoney(product.price)}
      </span>
    </button>
  )
}