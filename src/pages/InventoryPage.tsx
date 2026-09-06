import { useCallback, useState } from 'react'
import { ProductFormModal } from '../components/inventory/ProductFormModal'
import { ProductTable } from '../components/inventory/ProductTable'
import { useProducts } from '../hooks/useProducts'
import type { ProductosInsert } from '../types/database.types'

export function InventoryPage() {
  const { products, loading, error, refresh, addProduct } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const lowStockCount = products.filter(
    (product) => product.stock_actual <= product.stock_minimo,
  ).length
  const totalProducts = products.length

  const showNotice = useCallback((message: string): void => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 4000)
  }, [])

  const handleAddProduct = async (product: ProductosInsert): Promise<void> => {
    await addProduct(product)
    setModalOpen(false)
    showNotice(`Producto "${product.nombre}" agregado correctamente`)
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Inventario</h1>
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="text-slate-500">
              {totalProducts} {totalProducts === 1 ? 'producto' : 'productos'}
            </span>
            {lowStockCount > 0 && (
              <span className="rounded-full bg-rose-100 px-3 py-0.5 font-bold text-rose-700">
                {lowStockCount} con stock bajo
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-14 rounded-2xl bg-sky-500 px-6 text-lg font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98]"
        >
          + Nuevo producto
        </button>
      </header>

      {loading ? (
        <p className="py-10 text-center text-lg text-slate-400">Cargando productos…</p>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-rose-50 p-8 text-center">
          <p className="text-lg font-semibold text-rose-700">
            No se pudieron cargar los productos: {error}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      ) : totalProducts === 0 ? (
        <p className="py-10 text-center text-lg text-slate-400">
          Aún no hay productos. Agrega el primero.
        </p>
      ) : (
        <ProductTable products={products} />
      )}

      {modalOpen && (
        <ProductFormModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleAddProduct}
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-6 z-10 mx-auto w-max rounded-2xl bg-emerald-500 px-6 py-3 text-lg font-bold text-white shadow-xl"
        >
          ✓ {notice}
        </div>
      )}
    </div>
  )
}