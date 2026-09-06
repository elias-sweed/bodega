import { useMemo, useState } from 'react'
import { Cart } from '../components/pos/Cart'
import { CategoryGrid } from '../components/pos/CategoryGrid'
import { ProductGrid } from '../components/pos/ProductGrid'
import { SearchBar } from '../components/pos/SearchBar'
import { CATEGORIES, PRODUCTS } from '../data/mockData'
import type { CartItem, Category, Product } from '../types'
import { formatMoney } from '../utils/format'

export function PosPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [chargedTotal, setChargedTotal] = useState<string | null>(null)

  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0

  const filteredProducts = useMemo((): Product[] => {
    const source = isSearching ? PRODUCTS : PRODUCTS.filter(
      (product) => product.categoryId === selectedCategory?.id,
    )

    return source.filter((product) => {
      const name = product.name.toLowerCase()
      const barcode = product.barcode?.toLowerCase() ?? ''
      return name.includes(query) || barcode.includes(query)
    })
  }, [query, isSearching, selectedCategory])

  const addProduct = (product: Product): void => {
    setChargedTotal(null)
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...current, { product, quantity: 1 }]
    })
  }

  const increaseQuantity = (productId: string): void => {
    setChargedTotal(null)
    setCart((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    )
  }

  const decreaseQuantity = (productId: string): void => {
    setChargedTotal(null)
    setCart((current) =>
      current
        .flatMap((item) =>
          item.product.id === productId
            ? item.quantity > 1
              ? [{ ...item, quantity: item.quantity - 1 }]
              : []
            : [item],
        )
        .filter((item): item is CartItem => item !== undefined),
    )
  }

  const handleSearchEnter = (): void => {
    if (!query) return
    const match = PRODUCTS.find(
      (product) =>
        product.barcode?.toLowerCase() === query ||
        product.name.toLowerCase() === query,
    )
    if (match) {
      addProduct(match)
      setSearch('')
    }
  }

  const handleCharge = (total: number): void => {
    setCart([])
    setChargedTotal(formatMoney(total))
  }

  const content = isSearching ? (
    <ProductGrid
      products={filteredProducts}
      title="Resultados de búsqueda"
      onAdd={addProduct}
    />
  ) : selectedCategory ? (
    <div>
      <button
        type="button"
        onClick={() => setSelectedCategory(null)}
        className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
      >
        ← Volver a categorías
      </button>
      <ProductGrid
        products={filteredProducts}
        title={selectedCategory.label}
        onAdd={addProduct}
      />
    </div>
  ) : (
    <CategoryGrid
      categories={CATEGORIES}
      onSelect={(category) => {
        setSelectedCategory(category)
        setSearch('')
      }}
    />
  )

  return (
    <div className="grid h-full grid-cols-1 gap-6 overflow-y-auto pb-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:overflow-hidden lg:pb-0">
      <section className="flex min-h-0 flex-col gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          onEnter={handleSearchEnter}
        />
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{content}</div>
      </section>

      <div className="min-h-0">
        <Cart
          items={cart}
          onIncrease={increaseQuantity}
          onDecrease={decreaseQuantity}
          onCharge={handleCharge}
        />
      </div>

      {chargedTotal && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-10 mx-auto w-max rounded-2xl bg-emerald-500 px-6 py-3 text-lg font-bold text-white shadow-xl"
        >
          ✓ Venta por {chargedTotal} cobrada
        </div>
      )}
    </div>
  )
}