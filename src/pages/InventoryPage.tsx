import { useCallback, useState } from 'react'
import { ConfirmDeleteModal } from '../components/inventory/ConfirmDeleteModal'
import { ProductFormModal } from '../components/inventory/ProductFormModal'
import { ProductTable } from '../components/inventory/ProductTable'
import {
  StockAdjustModal,
  type StockAdjustPayload,
} from '../components/inventory/StockAdjustModal'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { ajustarStock } from '../services/products'
import type { ProductosInsert, ProductosRow, ProductosUpdate } from '../types/database.types'

function isForeignKeyError(cause: unknown): boolean {
  const message = (
    cause instanceof Error ? cause.message : String(cause)
  ).toLowerCase()
  return message.includes('violates foreign key constraint')
}

export function InventoryPage() {
  const { rol } = useAuth()
  const isAdmin = rol === 'admin'
  const { products, loading, error, refresh, addProduct, updateProduct, deleteProduct } =
    useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductosRow | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductosRow | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductosRow | null>(null)
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
    const stockDelta = product.stock_actual - editingProduct.stock_actual
    const nuevoStock = editingProduct.stock_actual + stockDelta
    if (nuevoStock < 0) {
      showNotice('error', 'El stock no puede ser negativo.')
      return
    }

    const updates: ProductosUpdate = {
      nombre: product.nombre,
      categoria: product.categoria,
      codigo_barras: product.codigo_barras,
      precio_venta: product.precio_venta,
      costo: product.costo,
      stock_minimo: product.stock_minimo,
    }

    try {
      await updateProduct(editingProduct.id, updates)
      if (stockDelta !== 0) {
        await ajustarStock(editingProduct.id, nuevoStock)
      }
      setEditingProduct(null)
      showNotice('success', `Producto "${product.nombre}" actualizado`)
      refresh(true)
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo actualizar el producto',
      )
    }
  }

  const handleAdjustStock = async (payload: StockAdjustPayload): Promise<void> => {
    if (!adjustingProduct) return
    const nuevoStock = payload.stock
    if (nuevoStock < 0) {
      showNotice('error', 'El stock no puede ser negativo.')
      return
    }
    try {
      const updated = await ajustarStock(
        adjustingProduct.id,
        nuevoStock,
        payload.esRegalo,
        payload.motivo,
      )
      setAdjustingProduct(null)
      showNotice(
        'success',
        `Stock de "${adjustingProduct.nombre}" ajustado a ${updated.stock_actual} (${payload.motivo})`,
      )
      refresh(true)
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo ajustar el stock',
      )
    }
  }

  const handleDeleteRequest = (product: ProductosRow): void => {
    setDeletingProduct(product)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deletingProduct) return
    const product = deletingProduct
    try {
      await deleteProduct(product.id)
      setDeletingProduct(null)
      showNotice('success', `Producto "${product.nombre}" eliminado`)
    } catch (cause) {
      throw new Error(
        isForeignKeyError(cause)
          ? 'No se puede eliminar porque tiene historial de ventas asociadas'
          : cause instanceof Error
            ? cause.message
            : 'No se pudo eliminar el producto',
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
          onDelete={(product) => handleDeleteRequest(product)}
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

      {deletingProduct && (
        <ConfirmDeleteModal
          product={deletingProduct}
          onCancel={() => setDeletingProduct(null)}
          onConfirm={confirmDelete}
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