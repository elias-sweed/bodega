import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ClipboardList, PackagePlus, RotateCcw } from 'lucide-react'
import { Toast } from '../components/common/Toast'
import { ConfirmDeleteModal } from '../components/inventory/ConfirmDeleteModal'
import { InitialStockModal } from '../components/inventory/InitialStockModal'
import { InventorySkeleton } from '../components/inventory/InventorySkeleton'
import { KardexModal } from '../components/inventory/KardexModal'
import { ProductFormModal } from '../components/inventory/ProductFormModal'
import { ProductTable } from '../components/inventory/ProductTable'
import {
  StockAdjustModal,
  type StockAdjustPayload,
} from '../components/inventory/StockAdjustModal'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { ajustarStock } from '../services/products'
import type {
  CargarInventarioInicialItem,
  ProductosInsert,
  ProductosRow,
} from '../types/database.types'
import { getFriendlyError } from '../utils/errors'

export function InventoryPage() {
  const { rol } = useAuth()
  const isAdmin = rol === 'admin'
  const {
    products,
    loading,
    error,
    refresh,
    addProduct,
    loadInitialInventory,
    updateProduct,
    deleteProduct,
  } = useProducts()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const recentIds = useMemo<string[]>(
    () =>
      Array.isArray((location.state as { recentIds?: unknown } | null)?.recentIds)
        ? ((location.state as { recentIds: string[] }).recentIds ?? [])
        : [],
    // Se lee una sola vez al entrar desde Compras
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const initialNewName = searchParams.get('nuevo')
  const [modalOpen, setModalOpen] = useState(initialNewName !== null)
  const [initialStockOpen, setInitialStockOpen] = useState(false)
  const [prefill, setPrefill] = useState<{
    nombre: string
    categoria: string
    codigo_barras?: string
    precio_venta?: string
    costo?: string
    stock_minimo?: string
  } | null>(
    initialNewName ? { nombre: initialNewName, categoria: '' } : null,
  )
  const [editingProduct, setEditingProduct] = useState<ProductosRow | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductosRow | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductosRow | null>(null)
  const [kardexProduct, setKardexProduct] = useState<ProductosRow | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const noticeTimer = useRef<number | null>(null)

  useEffect(() => {
    if (initialNewName) {
      setSearchParams({}, { replace: true })
    }
  }, [initialNewName, setSearchParams])

  const lowStockCount = products.filter(
    (product) => product.stock_actual <= product.stock_minimo,
  ).length
  const totalProducts = products.length

  useEffect(
    () => () => {
      if (noticeTimer.current !== null) {
        window.clearTimeout(noticeTimer.current)
      }
    },
    [],
  )

  const showNotice = useCallback(
    (type: 'success' | 'error', message: string): void => {
      setNotice({ type, message })
      if (noticeTimer.current !== null) {
        window.clearTimeout(noticeTimer.current)
      }
      noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
    },
    [],
  )

  const handleAddProduct = async (product: ProductosInsert): Promise<void> => {
    await addProduct(product)
    setModalOpen(false)
    showNotice('success', `Producto "${product.nombre}" agregado correctamente`)
  }

  const handleLoadInitialInventory = async (
    items: CargarInventarioInicialItem[],
  ): Promise<void> => {
    const result = await loadInitialInventory(items)
    setInitialStockOpen(false)
    showNotice(
      'success',
      `Inventario inicial guardado: ${result.productos} ${
        result.productos === 1 ? 'producto' : 'productos'
      } y ${result.unidades} ${result.unidades === 1 ? 'unidad' : 'unidades'}.`,
    )
  }

  const handleEditProduct = async (product: ProductosInsert): Promise<void> => {
    if (!editingProduct) return

    try {
      await updateProduct(editingProduct.id, {
        nombre: product.nombre,
        categoria: product.categoria,
        codigo_barras: product.codigo_barras,
        precio_venta: product.precio_venta,
        costo: product.costo,
        stock_minimo: product.stock_minimo,
        nuevoStock: product.stock_actual,
        motivo: 'Edición de producto desde Inventario',
      })
      setEditingProduct(null)
      showNotice('success', `Producto "${product.nombre}" actualizado`)
    } catch (cause) {
      showNotice(
        'error',
        getFriendlyError(cause, 'No se pudo actualizar el producto. Inténtalo de nuevo.'),
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
        getFriendlyError(cause, 'No se pudo ajustar el stock. Inténtalo de nuevo.'),
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
        getFriendlyError(cause, 'No se pudo eliminar el producto. Inténtalo de nuevo.'),
      )
    }
  }

  return (
    <div className="inventario-pos mx-auto flex h-full w-full max-w-7xl flex-col gap-5 bg-transparent">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Catálogo
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink">
            Inventario
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="rounded-full border border-line bg-surface px-3 py-0.5 text-xs font-bold text-muted backdrop-blur-xl">
              {totalProducts} {totalProducts === 1 ? 'producto' : 'productos'}
            </span>
            {lowStockCount > 0 && (
              <span className="rounded-full border border-rose-400/40 bg-rose-400/15 px-3 py-0.5 text-xs font-black text-loss backdrop-blur-xl">
                {lowStockCount} con stock bajo
              </span>
            )}
            {loading && products.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-0.5 text-xs font-bold text-muted backdrop-blur-xl">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
                Sincronizando…
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setInitialStockOpen(true)}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-sky-300/35 bg-sky-400/15 px-5 text-sm font-black uppercase tracking-[0.1em] text-ink transition-colors hover:bg-sky-400/25 active:scale-[0.98]"
            >
              <ClipboardList size={19} aria-hidden="true" />
              Cargar inventario inicial
            </button>
            <button
              type="button"
              onClick={() => {
                setPrefill(null)
                setModalOpen(true)
              }}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 px-6 text-base font-black uppercase tracking-[0.12em] text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-[0.98]"
            >
              <PackagePlus size={19} aria-hidden="true" />
              Nuevo producto
            </button>
          </div>
        )}
      </header>

      {loading && products.length === 0 ? (
        <InventorySkeleton />
      ) : error && products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-400/30 bg-rose-400/10 p-8 text-center shadow-sm backdrop-blur-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/30 text-loss">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <p className="text-lg font-extrabold tracking-tight text-ink">
            No se pudieron cargar los productos
          </p>
          <p className="text-sm font-medium text-muted">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : totalProducts === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[28px] border border-line bg-surface p-12 text-center backdrop-blur-2xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
            <PackagePlus size={26} aria-hidden="true" />
          </span>
          <p className="text-lg font-black tracking-tight text-ink">Aún no hay productos</p>
          <p className="max-w-md text-sm font-medium text-muted">
            Carga lo que ya tienes en la bodega o crea el primer producto del catálogo.
          </p>
          {isAdmin && (
            <div className="mt-3 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setInitialStockOpen(true)}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-sky-300/35 bg-sky-400/15 px-4 text-sm font-black text-ink transition-colors hover:bg-sky-400/25"
              >
                <ClipboardList size={17} aria-hidden="true" />
                Cargar inventario inicial
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrefill(null)
                  setModalOpen(true)
                }}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 px-4 text-sm font-black text-slate-900 transition-colors hover:brightness-105"
              >
                <PackagePlus size={17} aria-hidden="true" />
                Nuevo producto
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="fade-in">
          <ProductTable
            products={products}
            isAdmin={isAdmin}
            onEdit={(product) => setEditingProduct(product)}
            onAdjustStock={(product) => setAdjustingProduct(product)}
            onDelete={(product) => handleDeleteRequest(product)}
            onKardex={(product) => setKardexProduct(product)}
            pinnedIds={recentIds}
          />
        </div>
      )}

      {initialStockOpen && (
        <InitialStockModal
          products={products}
          onClose={() => setInitialStockOpen(false)}
          onSubmit={handleLoadInitialInventory}
        />
      )}

      {modalOpen && (
        <ProductFormModal
          initialPrefill={prefill}
          onClose={() => {
            setModalOpen(false)
            setPrefill(null)
          }}
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

      {kardexProduct && (
        <KardexModal
          product={kardexProduct}
          onClose={() => setKardexProduct(null)}
        />
      )}

      {notice && <Toast type={notice.type} message={notice.message} />}
    </div>
  )
}