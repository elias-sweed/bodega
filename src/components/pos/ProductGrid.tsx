import type { ProductosRow } from '../../types/database.types'
import { ProductButton } from './ProductButton'

interface ProductGridProps {
  products: ProductosRow[]
  title: string
  onAdd: (product: ProductosRow) => void
}

export function ProductGrid({ products, title, onAdd }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="mt-10 text-center text-lg text-slate-400">
        Sin resultados. Prueba con otro nombre o código de barras.
      </p>
    )
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-700">{title}</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductButton
            key={product.id}
            product={product}
            onClick={() => onAdd(product)}
          />
        ))}
      </div>
    </section>
  )
}