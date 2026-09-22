import type { ProductosRow } from '../../types/database.types'
import { ProductButton } from './ProductButton'

interface ProductGridProps {
  products: ProductosRow[]
  title: string
  cartQuantities: Map<string, number>
  highlightId: string | null
  onAdd: (product: ProductosRow) => void
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
}

export function ProductGrid({
  products,
  title,
  cartQuantities,
  highlightId,
  onAdd,
  onIncrease,
  onDecrease,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="mt-6 rounded-[28px] border border-line bg-surface p-10 text-center backdrop-blur-2xl">
        <p className="text-lg font-black tracking-tight text-ink">Sin resultados</p>
        <p className="mt-1 text-sm font-medium text-muted">
          Prueba con otro nombre o código de barras.
        </p>
      </div>
    )
  }

  return (
    <section className="fade-in">
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-muted">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductButton
            key={product.id}
            product={product}
            qtyInCart={cartQuantities.get(product.id) ?? 0}
            highlight={highlightId === product.id}
            onAdd={() => onAdd(product)}
            onIncrease={() => onIncrease(product.id)}
            onDecrease={() => onDecrease(product.id)}
          />
        ))}
      </div>
    </section>
  )
}
