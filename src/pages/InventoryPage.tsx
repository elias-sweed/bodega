import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ClipboardList, PackagePlus, Repeat, RotateCcw } from 'lucide-react'
import { Toast } from '../components/common/Toast'
import { HelpTip } from '../components/common/HelpTip'
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
import { ServiceTable } from '../components/inventory/ServiceTable'
import { useAuth } from '../hooks/useAuth'
import { useInventoryModals } from '../hooks/useInventoryModals'
import { useProducts } from '../hooks/useProducts'
import { ajustarStock } from '../services/products'
import { getProductsCache } from '../services/productsCache'
import { addRecientes, getRecientesIds, subscribeRecientes } from '../services/recientesStore'
import type {
  CargarInventarioInicialItem,
  ProductosInsert,
  ProductosRow,
} from '../types/database.types'
import { getFriendlyError } from '../utils/errors'
import { normalizeText } from '../utils/format'

/** Id real del producto recién creado: primero por nombre en la caché (la DB
 * es la fuente de verdad); si no, el que devolvió la RPC. */
function resolveCreatedId(returnedId: string | null, nombre: string): string | null {
  const catalog = getProductsCache().products
  if (catalog) {
    const normalized = normalizeText(nombre)
    const match = catalog.find((product) => normalizeText(product.nombre) === normalized)
    if (match) return match.id
  }
  return returnedId
}

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
  const [focusProductId, setFocusProductId] = useState<string | null>(null)
  const [recientesIds, setRecientesIds] = useState<string[]>(getRecientesIds)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const noticeTimer = useRef<number | null>(null)

  const {
    modalOpen,
    setModalOpen,
    initialStockOpen,
    setInitialStockOpen,
    editingProduct,
    setEditingProduct,
    adjustingProduct,
    setAdjustingProduct,
    deletingProduct,
    setDeletingProduct,
    kardexProduct,
    setKardexProduct,
  } = useInventoryModals()

  useEffect(
    () => subscribeRecientes(() => setRecientesIds(getRecientesIds())),
    [],
  )

  useEffect(() => {
    // Lo recién llegado desde Compras también cuenta como "recientes"
    if (recentIds.length > 0) addRecientes(recentIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (initialNewName) {
      setSearchParams({}, { replace: true })
    }
  }, [initialNewName, setSearchParams])

  const lowStockCount = products.filter(
    (product) =>
      product.tipo !== 'servicio' && product.stock_actual <= product.stock_minimo,
  ).length
  const physicalProducts = useMemo(
    () => products.filter((product) => product.tipo !== 'servicio'),
    [products],
  )
  const services = useMemo(
    () => products.filter((product) => product.tipo === 'servicio'),
    [products],
  )
  const totalProducts = physicalProducts.length
  const [vista, setVista] = useState<'productos' | 'servicios'>('productos')
  const [creatingService, setCreatingService] = useState(false)

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

  const markRecientes = useCallback((ids: string[]): void => {
    addRecientes(ids)
  }, [])

  const handleAddProduct = async (product: ProductosInsert): Promise<void> => {
    const created = await addProduct(product)
    setModalOpen(false)
    // La RPC no siempre devuelve la fila completa: si falta el id, lo
    // buscamos por nombre en la caché ya refrescada para poder marcarlo.
    const resolvedId = resolveCreatedId(
      typeof created?.id === 'string' && created.id !== '' ? created.id : null,
      product.nombre,
    )
    if (resolvedId !== null) {
      markRecientes([resolvedId])
      setFocusProductId(resolvedId)
    }
    setCreatingService(false)
    showNotice(
      'success',
      product.tipo === 'servicio'
        ? `Servicio "${product.nombre}" agregado correctamente`
        : `Producto "${product.nombre}" agregado correctamente`,
    )
  }

  const handleLoadInitialInventory = async (
    items: CargarInventarioInicialItem[],
  ): Promise<void> => {
    const result = await loadInitialInventory(items)
    setInitialStockOpen(false)

    // Los productos nuevos no devuelven su id desde la RPC: los ubicamos al
    // refrescar la caché comparando por nombre para marcarlos y saltar a ellos.
    const nuevos = items.filter((item): item is Extract<CargarInventarioInicialItem, { tipo: 'nuevo' }> => item.tipo === 'nuevo')
    let nuevosIds: string[] = []
    if (nuevos.length > 0) {
      const catalog = getProductsCache().products ?? products
      const byName = new Map<string, string>()
      for (const product of catalog) {
        byName.set(normalizeText(product.nombre), product.id)
      }
      nuevosIds = nuevos
        .map((item) => byName.get(normalizeText(item.nombre)))
        .filter((id): id is string => typeof id === 'string')
    }
    if (nuevosIds.length > 0) {
      markRecientes(nuevosIds)
      setFocusProductId(nuevosIds[0])
    }

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
        tipo: product.tipo,
        consumo_producto_id: product.consumo_producto_id,
        consumo_por_unidad: product.consumo_por_unidad,
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
      showNotice(
        'error',
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
            <span className="rounded-full border border-sky-300/40 bg-sky-400/10 px-3 py-0.5 text-xs font-black text-sky-300 backdrop-blur-xl">
              {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
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
          <div className="flex flex-wrap items-center gap-2.5">
            <HelpTip
              title="¿Inventario inicial o Nuevo producto?"
              label="¿Cuál uso?"
              text="Usa 'Cargar inventario inicial' para contar lo que YA tienes en la bodega ahora mismo. Usa 'Nuevo producto' cuando agregas algo que nunca habías vendido. Las compras de mercadería que llegan después no van aquí: van en Compras."
              example="Ya vendes atún y tienes 15 latas: eso es inventario inicial. Quieres empezar a vender chocolate: ese es nuevo producto."
            />
            <button
              type="button"
              onClick={() => setInitialStockOpen(true)}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-sky-300/35 bg-sky-400/15 px-5 text-sm font-black uppercase tracking-widest text-ink transition-colors hover:bg-sky-400/25 active:scale-[0.98]"
            >
              <ClipboardList size={19} aria-hidden="true" />
              Cargar inventario inicial
            </button>
            <button
              type="button"
              onClick={() => {
                setPrefill(null)
                setCreatingService(true)
                setModalOpen(true)
              }}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-sky-300/35 bg-sky-400/15 px-5 text-sm font-black uppercase tracking-widest text-ink transition-colors hover:bg-sky-400/25 active:scale-[0.98]"
            >
              <Repeat size={19} aria-hidden="true" />
              Nuevo servicio
            </button>
            <button
              type="button"
              onClick={() => {
                setPrefill(null)
                setCreatingService(false)
                setModalOpen(true)
              }}
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 px-6 text-base font-black uppercase tracking-[0.12em] text-slate-900 shadow-[0_14px 35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-[0.98]"
            >
              <PackagePlus size={19} aria-hidden="true" />
              Nuevo producto
            </button>
          </div>
        )}
      </header>

      <div className="flex shrink-0 gap-2">
        {(
          [
            { id: 'productos', label: 'Productos', count: totalProducts },
            { id: 'servicios', label: 'Servicios', count: services.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setVista(tab.id)}
            aria-pressed={vista === tab.id}
            className={`rounded-2xl border px-5 py-2.5 text-sm font-black uppercase tracking-widest transition-colors ${
              vista === tab.id
                ? 'border-amber-300/60 bg-amber-400/20 text-ink'
                : 'border-line bg-surface text-muted hover:bg-surface-3'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

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
      ) : vista === 'servicios' ? (
        <div className="fade-in">
          <ServiceTable
            services={services}
            catalog={products}
            isAdmin={isAdmin}
            onEdit={(product) => setEditingProduct(product)}
            onDelete={(product) => handleDeleteRequest(product)}
          />
        </div>
      ) : products.length === 0 ? (
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
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 px-4 text-sm font-black text-slate-900 transition-colors hover:brightness-105"
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
            products={physicalProducts}
            isAdmin={isAdmin}
            onEdit={(product) => setEditingProduct(product)}
            onAdjustStock={(product) => setAdjustingProduct(product)}
            onDelete={(product) => handleDeleteRequest(product)}
            onKardex={(product) => setKardexProduct(product)}
            pinnedIds={recentIds}
            flashId={focusProductId}
            recientesIds={recientesIds}
          />
        </div>
      )}

      {initialStockOpen && (
        <InitialStockModal
          onClose={() => setInitialStockOpen(false)}
          onSubmit={handleLoadInitialInventory}
        />
      )}

      {modalOpen && (
        <ProductFormModal
          initialPrefill={prefill}
          initialTipo={creatingService ? 'servicio' : 'producto'}
          productosDisponibles={products}
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
          productosDisponibles={products}
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
