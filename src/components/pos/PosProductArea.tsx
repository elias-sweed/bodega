import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { CategoryGrid } from './CategoryGrid'
import { ProductGrid } from './ProductGrid'
import { SearchBar } from './SearchBar'
import type { Category } from '../../types'
import type { ProductosRow } from '../../types/database.types'

interface PosProductAreaProps {
  products: ProductosRow[]
  loading: boolean
  error: string | null
  search: string
  onSearchChange: (value: string) => void
  onSearchEnter: () => void
  selectedCategory: Category | null
  onSelectCategory: (category: Category | null) => void
  categories: Category[]
  filteredProducts: ProductosRow[]
  outOfStockProducts: ProductosRow[]
  cartQtyById: Map<string, number>
  highlightId: string | null
  onAdd: (product: ProductosRow) => void
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
  onRetry: () => void
  isFirstLoad: boolean
  isSearching: boolean
}

/**
 * Componente que renderiza el área de productos en la página de Caja.
 * Incluye búsqueda, categorías, productos agotados y resultados de búsqueda.
 */
export function PosProductArea({
  products,
  loading,
  error,
  search,
  onSearchChange,
  onSearchEnter,
  selectedCategory,
  onSelectCategory,
  categories,
  filteredProducts,
  outOfStockProducts,
  cartQtyById,
  highlightId,
  onAdd,
  onIncrease,
  onDecrease,
  onRetry,
  isFirstLoad,
  isSearching,
}: PosProductAreaProps) {
  if (isFirstLoad) {
    return null // El skeleton se renderiza en PosPage
  }

  if (error && products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-200/25 bg-rose-500/15 p-8 text-center shadow-sm backdrop-blur-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/25 text-loss">
          <AlertTriangle size={22} aria-hidden="true" />
        </span>
        <p className="text-lg font-extrabold tracking-tight text-ink">
          No se pudieron cargar los productos
        </p>
        <p className="text-sm font-medium text-muted">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-lg transition-transform duration-300 hover:-translate-y-0.5"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <section className="flex min-h-0 flex-col gap-4">
      <SearchBar
        value={search}
        onChange={onSearchChange}
        onEnter={onSearchEnter}
      />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isSearching ? (
          <ProductGrid
            products={filteredProducts}
            title="Resultados de búsqueda"
            cartQuantities={cartQtyById}
            highlightId={highlightId}
            onAdd={onAdd}
            onIncrease={onIncrease}
            onDecrease={onDecrease}
          />
        ) : selectedCategory ? (
          <div className="fade-in">
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0 active:scale-95"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Volver a categorías
            </button>
            <ProductGrid
              products={filteredProducts}
              title={selectedCategory.label}
              cartQuantities={cartQtyById}
              highlightId={highlightId}
              onAdd={onAdd}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
            />
          </div>
        ) : products.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-line bg-surface p-10 text-center">
            <h2 className="text-lg font-black tracking-tight text-ink">
              No hay productos en el inventario
            </h2>
            <p className="mt-2 text-sm font-medium text-muted">
              Los productos creados en Inventario aparecerán aquí automáticamente.
            </p>
          </section>
        ) : (
          <div className="fade-in space-y-8">
            {categories.length > 0 && (
              <CategoryGrid
                categories={categories}
                onSelect={(category) => {
                  onSelectCategory(category)
                }}
              />
            )}
            {outOfStockProducts.length > 0 && (
              <ProductGrid
                products={outOfStockProducts}
                title="Productos agotados"
                cartQuantities={cartQtyById}
                highlightId={highlightId}
                onAdd={onAdd}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
