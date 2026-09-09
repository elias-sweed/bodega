import { useCallback, useState } from 'react'
import { ProductFormModal } from '../components/inventory/ProductFormModal'
import { ProductTable } from '../components/inventory/ProductTable'
import { StockAdjustModal } from '../components/inventory/StockAdjustModal'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import type { ProductosInsert, ProductosRow } from '../types/database.types'

export function InventoryPage() {
  const { rol } = useAuth()
  const isAdmin = rol === 'admin'
  const { products, loading, error, refresh, addProduct, updateProduct, deleteProduct } =
    useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductosRow | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductosRow | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const lowStockCount = products.filter(
    (product) => product.stock_actual <= product.stock_minimo,
  ).length
  const totalProducts = products.length

  const showNotice = useCallback(
    (type: 'success' | 'error', message: string): void => {
      setNotice({ type, message })
      window.setTimeout(() => setNotice(null), 4000)
    },
    [],
  )

  const handleAddProduct = async (product: ProductosInsert): Promise<void> => {
    await addProduct(product)
    setModalOpen(false)
    showNotice('success', `Producto "${product.nombre}" agregado correctamente`)
  }

  const handleEditProduct = async (product: ProductosInsert): Promise<void> => {
    if (!editingProduct) return
    await updateProduct(editingProduct.id, product)
    setEditingProduct(null)
    showNotice('success', `Producto "${product.nombre}" actualizado`)
  }

  const handleAdjustStock = async (newStock: number): Promise<void> => {
    if (!adjustingProduct) return
    await updateProduct(adjustingProduct.id, { stock_actual: newStock })
    setAdjustingProduct(null)
    showNotice('success', `Stock de "${adjustingProduct.nombre}" ajustado a ${newStock}`)
  }

  const handleDelete = async (product: ProductosRow): Promise<void> => {
    const ok = window.confirm(
      `¿Seguro que quieres eliminar "${product.nombre}"?\nSe quitará del catálogo y de fututas ventas.`,
    )
    if (!ok) return
    try {
      await deleteProduct(product.id)
      showNotice('success', `Producto "${product.nombre}" eliminado`)
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo eliminar el producto',
      )
    }
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
            onClick={() => refresh()}
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
        <ProductTable
          products={products}
          isAdmin={isAdmin}
          onEdit={(product) => setEditingProduct(product)}
          onAdjustStock={(product) => setAdjustingProduct(product)}
          onDelete={(product) => void handleDelete(product)}
        />
      )}

      {modalOpen && (
        <ProductFormModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleAddProduct}
        />
      )}

      {editingProduct && (
        <ProductFormModal
          initial={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSubmit={handleEditProduct}
        />
      )}

      {adjustingProduct && (
        <StockAdjustModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onSubmit={handleAdjustStock}
        />
      )}

      {notice && (
        <div
          role="status"
          className={`fixed inset-x-0 bottom-6 z-10 mx-auto w-max rounded-2xl px-6 py-3 text-lg font-bold text-white shadow-xl ${
            notice.type === 'success' ? 'bg-emerald-500' : 'bg-rose-600'
          }`}
        >
          {notice.type === 'success' ? '✓ ' : '✕ '}
          {notice.message}
        </div>
      )}
    </div>
  )
}