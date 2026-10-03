import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PauseCircle } from 'lucide-react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { SyncStatusBar } from '../components/common/SyncStatusBar'
import { Toast } from '../components/common/Toast'
import { METODO_PAGO_DEFAULT, type MetodoPago } from '../components/pos/metodosPago'
import { PaymentModal } from '../components/pos/PaymentModal'
import { PosProductArea } from '../components/pos/PosProductArea'
import { PosSidebar } from '../components/pos/PosSidebar'
import { PosSkeleton } from '../components/pos/PosSkeleton'
import { ReceiptModal, type LastSale } from '../components/pos/ReceiptModal'
import { useAuth } from '../hooks/useAuth'
import { HelpTip } from '../components/common/HelpTip'
import { usePosCart } from '../hooks/usePosCart'
import { useProducts } from '../hooks/useProducts'
import { useSuspendedSale } from '../hooks/useSuspendedSale'
import { emitDataChanged } from '../services/dataEvents'
import { useAutoSync } from '../hooks/useAutoSync'
import { applyStockChanges } from '../services/productsCache'
import { ajustarStock } from '../services/products'
import { getStockShortIds, registrarVenta, VentaError } from '../services/sales'
import { subscribeToVentasLive } from '../services/ventasRealtime'
import {
  addPendingSale,
  countPendingSales,
  isNetworkError,
  isOffline,
  type PendingSaleItem,
} from '../services/offlineQueue'
import type { Category } from '../types'
import type { ProductosRow } from '../types/database.types'
import { deriveCategories } from '../utils/categories'
import { getFriendlyError } from '../utils/errors'
import { formatMoney, normalizeText } from '../utils/format'

type Notice = {
  type: 'success' | 'error'
  message: string
}

function orderProductsForCaja(products: ProductosRow[]): ProductosRow[] {
  return [...products].sort((a, b) => {
    const agotadoA = a.stock_actual <= 0 ? 1 : 0
    const agotadoB = b.stock_actual <= 0 ? 1 : 0
    return agotadoA - agotadoB || a.nombre.localeCompare(b.nombre, 'es')
  })
}

export function PosPage() {
  const { user } = useAuth()
  const { products, loading, error, refresh } = useProducts()
  const {
    cart,
    addProduct,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    cartQtyById,
    totalPrice,
  } = usePosCart()
  const { suspendedSale, handleSuspend, handleResume, handleDiscardSuspended } =
    useSuspendedSale(user?.id)

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [charging, setCharging] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [lastSale, setLastSale] = useState<LastSale | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(METODO_PAGO_DEFAULT)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const highlightTimer = useRef<number | undefined>(undefined)
  const saleKeyRef = useRef<string | null>(null)
  const lastOwnSaleAt = useRef(0)

  const flashHighlight = useCallback((productId: string): void => {
    setHighlightId(productId)
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1200)
  }, [])

  const handleAddProduct = useCallback((product: ProductosRow): void => {
    addProduct(product)
    flashHighlight(product.id)
  }, [addProduct, flashHighlight])

  const handleIncreaseQuantity = useCallback((productId: string): void => {
    increaseQuantity(productId)
    flashHighlight(productId)
  }, [increaseQuantity, flashHighlight])

  const handleDecreaseQuantity = useCallback((productId: string): void => {
    decreaseQuantity(productId)
    flashHighlight(productId)
  }, [decreaseQuantity, flashHighlight])

  const showNotice = useCallback((type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ type, message })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }, [])

  // Sube sola las ventas guardadas offline al recuperar internet.
  useAutoSync((summary) => {
    if (summary.synced > 0) {
      // Son nuestras: marcamos la hora para no mostrar "otro dispositivo".
      lastOwnSaleAt.current = Date.now()
      showNotice(
        'success',
        `Se subieron ${summary.synced} venta${summary.synced === 1 ? '' : 's'} que estaban guardadas sin internet.`,
      )
    } else if (summary.failed > 0) {
      showNotice(
        'error',
        `${summary.failed} venta${summary.failed === 1 ? '' : 's'} no se pudo subir. Quedan guardadas y se reintentará sola.`,
      )
    }
  })

  // Aviso amigable cuando otro dispositivo registra una venta.
  useEffect(() => {
    const unsubscribe = subscribeToVentasLive(() => {
      if (Date.now() - lastOwnSaleAt.current < 4000) return
      showNotice(
        'success',
        '🔔 Se registró una venta desde otro dispositivo. El stock ya se actualizó.',
      )
    })
    return unsubscribe
  }, [showNotice])

  useEffect(() => {
    return () => {
      window.clearTimeout(noticeTimer.current)
      window.clearTimeout(highlightTimer.current)
    }
  }, [])

  const outOfStockProducts = useMemo(
    () => products.filter((product) => product.stock_actual <= 0),
    [products],
  )
  const categories = useMemo(() => deriveCategories(products), [products])

  const query = normalizeText(search)
  const isSearching = query.length > 0

  const filteredProducts = useMemo((): ProductosRow[] => {
    const source = isSearching
      ? orderProductsForCaja(products)
      : selectedCategory
        ? orderProductsForCaja(
            products.filter(
              (product) => product.categoria === selectedCategory.id,
            ),
          )
        : []

    return source.filter((product) => {
      const name = normalizeText(product.nombre)
      const barcode = normalizeText(product.codigo_barras ?? '')
      return name.includes(query) || barcode.includes(query)
    })
  }, [products, query, isSearching, selectedCategory])

  const cartSectionRef = useRef<HTMLDivElement>(null)
  const prevCartCount = useRef(0)
  useEffect(() => {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0)
    if (prevCartCount.current === 0 && count > 0) {
      if (window.matchMedia('(max-width: 1023px)').matches) {
        cartSectionRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
      }
    }
    prevCartCount.current = count
  }, [cart])

  const handleSearchEnter = (): void => {
    if (!query) return
    const match = products.find(
      (product) =>
        normalizeText(product.codigo_barras ?? '') === query ||
        normalizeText(product.nombre) === query,
    )
    if (match) {
      addProduct(match)
      setSearch('')
    }
  }

  const openPayment = (): void => {
    if (cart.length === 0 || charging) return
    saleKeyRef.current ??= crypto.randomUUID()
    setPaymentOpen(true)
  }

  const confirmPayment = async (): Promise<void> => {
    if (cart.length === 0 || charging) return
    // Guarda: si un servicio no tiene suficiente insumo (hojas), avisar antes.
    if (!isOffline()) {
      const consumoPorProducto = new Map<string, number>()
      for (const item of cart) {
        const vinculadoId = item.product.consumo_producto_id
        if (!vinculadoId || item.product.consumo_por_unidad <= 0) continue
        consumoPorProducto.set(
          vinculadoId,
          (consumoPorProducto.get(vinculadoId) ?? 0) +
            item.quantity * item.product.consumo_por_unidad,
        )
      }
      for (const [vinculadoId, usadas] of consumoPorProducto) {
        const vinculado = products.find((p) => p.id === vinculadoId)
        if (vinculado && usadas > vinculado.stock_actual) {
          showNotice(
            'error',
            `No se puede vender: «${vinculado.nombre}» tiene ${vinculado.stock_actual} unidades y esta venta necesita ${usadas}. Recarga primero.`,
          )
          return
        }
      }
    }
    setCharging(true)
    try {
      const idempotencyKey = saleKeyRef.current ?? crypto.randomUUID()
      saleKeyRef.current = idempotencyKey
      // Sin internet la venta NO se pierde: se guarda en la cola local y se
      // sincroniza sola cuando vuelva la conexión (Fase 2).
      if (isOffline()) {
        const items: PendingSaleItem[] = cart.map((item) => ({
          productoId: item.product.id,
          nombre: item.product.nombre,
          cantidad: item.quantity,
          precioUnitario: item.product.precio_venta,
        }))
        await addPendingSale({
          idempotencyKey,
          metodoPago,
          items,
          total: totalPrice,
          createdAt: new Date().toISOString(),
        })
        const pending = await countPendingSales()
        clearCart()
        setPaymentOpen(false)
        setSearch('')
        saleKeyRef.current = null
        showNotice(
          'success',
          `Sin internet: venta guardada en este equipo. Se subirá sola cuando vuelva la conexión. (${pending} venta${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'})`,
        )
        return
      }
      const result = await registrarVenta(cart, metodoPago, idempotencyKey)
      const receiptItems = cart.map((item) => {
        const serverItem = result.items.find(
          (detail) => detail.producto_id === item.product.id,
        )
        return {
          ...item,
          quantity: serverItem?.cantidad ?? item.quantity,
          product: {
            ...item.product,
            precio_venta: serverItem?.precio_unitario ?? item.product.precio_venta,
          },
        }
      })
      setLastSale({
        venta_id: result.venta_id,
        total: result.total,
        fecha: new Date().toISOString(),
        items: receiptItems,
        metodo_pago: metodoPago,
      })
      const soldOut = cart.filter(
        (item) => item.quantity >= item.product.stock_actual,
      )
      clearCart()
      setPaymentOpen(false)
      setSearch('')
      const soldOutText =
        soldOut.length > 0
          ? ` · «${soldOut.map((item) => item.product.nombre).join('», «')}» ${
              soldOut.length === 1 ? 'quedó agotado' : 'quedaron agotados'
            }`
          : ''
      showNotice(
        'success',
        `Venta por ${formatMoney(result.total)} registrada${soldOutText}`,
      )
      applyStockChanges(
        cart.map((item) => ({
          id: item.product.id,
          stockActual: item.product.stock_actual - item.quantity,
        })),
      )
      // Consumo de insumos: cada servicio descuenta las unidades que usa
      // (ej.: "Impresión B/N" descuenta 1 hoja por copia).
      const consumoPorProducto = new Map<string, number>()
      for (const item of cart) {
        const vinculadoId = item.product.consumo_producto_id
        if (!vinculadoId || item.product.consumo_por_unidad <= 0) continue
        consumoPorProducto.set(
          vinculadoId,
          (consumoPorProducto.get(vinculadoId) ?? 0) +
            item.quantity * item.product.consumo_por_unidad,
        )
      }
      for (const [vinculadoId, usadas] of consumoPorProducto) {
        const vinculado = products.find((p) => p.id === vinculadoId)
        if (!vinculado) continue
        const nuevoStock = Math.max(0, vinculado.stock_actual - usadas)
        try {
          await ajustarStock(vinculadoId, nuevoStock, false, 'Consumo por servicios')
          applyStockChanges([{ id: vinculadoId, stockActual: nuevoStock }])
        } catch {
          showNotice(
            'error',
            `La venta quedó registrada, pero no se pudo descontar «${vinculado.nombre}». Revisa el inventario.`,
          )
        }
      }
      saleKeyRef.current = null
      lastOwnSaleAt.current = Date.now()
      refresh(true)
      emitDataChanged()
    } catch (cause) {
      const stockShortIds = getStockShortIds(cause)
      if (stockShortIds.length > 0) {
        const names = cart
          .filter((item) => stockShortIds.includes(item.product.id))
          .map((item) => item.product.nombre)
        showNotice(
          'error',
          `No se completó la venta: sin stock suficiente para «${names.join(', ')}». Ajusta la cantidad en el carrito e inténtalo de nuevo (tu carrito se mantiene).`,
        )
      } else if (isNetworkError(cause)) {
        try {
          const items: PendingSaleItem[] = cart.map((item) => ({
            productoId: item.product.id,
            nombre: item.product.nombre,
            cantidad: item.quantity,
            precioUnitario: item.product.precio_venta,
          }))
          const pendingSale = {
            idempotencyKey: saleKeyRef.current ?? crypto.randomUUID(),
            metodoPago,
            items,
            total: totalPrice,
            createdAt: new Date().toISOString(),
          }
          await addPendingSale(pendingSale)
          saleKeyRef.current = null
          const pending = await countPendingSales()
          clearCart()
          setPaymentOpen(false)
          setSearch('')
          showNotice(
            'success',
            `Se cayó la conexión: venta guardada en este equipo. Se subirá sola cuando vuelva internet. (${pending} pendiente${pending === 1 ? '' : 's'})`,
          )
        } catch {
          showNotice(
            'error',
            'Sin conexión y no se pudo guardar la venta en este equipo. Anota el total para no perderlo.',
          )
        }
      } else {
        showNotice(
          'error',
          cause instanceof VentaError
            ? cause.message
            : getFriendlyError(
                cause,
                'No se pudo registrar la venta. Inténtalo de nuevo.',
              ),
        )
      }
    } finally {
      setCharging(false)
    }
  }

  const handleSuspendSale = (): void => {
    if (cart.length === 0) return
    handleSuspend(cart, metodoPago)
    clearCart()
    showNotice('success', `Venta suspendida (${suspendedSale?.count ?? 0} ${
      (suspendedSale?.count ?? 0) === 1 ? 'artículo' : 'artículos'
    })`)
  }

  const handleResumeSale = (): void => {
    const result = handleResume(products)
    if (!result) {
      showNotice(
        'error',
        'No se pudo retomar la venta: sus productos ya no existen o no tienen stock.',
      )
      return
    }
    if (suspendedSale?.metodoPago) {
      setMetodoPago(suspendedSale.metodoPago)
    }
    showNotice('success', result.message)
  }

  const confirmDiscardSuspended = (): void => {
    handleDiscardSuspended()
    setDiscardOpen(false)
    showNotice('success', 'Venta suspendida descartada')
  }

  const retry = useCallback((): void => refresh(), [refresh])

  const isFirstLoad = loading && products.length === 0

  if (isFirstLoad) {
    return (
      <div className="caja-pos mx-auto flex h-full w-full max-w-7xl flex-col gap-4 bg-transparent">
        <PosSkeleton />
      </div>
    )
  }

  return (
    <div className="caja-pos mx-auto flex h-full w-full max-w-7xl flex-col gap-4 bg-transparent">
      <SyncStatusBar />
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Punto de venta
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink ">
            Caja
          </h1>
          <div className="mt-1.5">
            <HelpTip
              title="Caja: registrar ventas"
              label="¿Cómo funciona?"
              text="Aquí solo registras lo que los clientes compran. Toca un producto y se va al carrito; cuando termines, cobra y registra la venta. No uses esta pantalla para contar mercadería nueva: eso va en Compras."
              example="Llega un cliente y lleva 2 gaseosas y 1 atún: los tocas aquí, eliges cómo pagó y cobras."
            />
          </div>
        </div>
        {loading && products.length > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold text-muted backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
            Sincronizando catálogo…
          </span>
        )}
      </header>

      {suspendedSale && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[22px] border border-amber-300/30 bg-surface px-5 py-3.5 shadow-[0_22px_55px_-30_rgba(0,0,0,0.95)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/40 bg-gold/15 text-gold">
              <PauseCircle size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black tracking-tight text-ink">
                Hay una venta suspendida
                <HelpTip
                  title="Venta suspendida"
                  text="Guardaste una venta sin cobrar (por ejemplo para atender a otra persona). Toca 'Retomar venta' para seguir donde la dejaste o 'Descartar' para borrarla."
                  example="Un cliente se fue a buscar vuelto: suspendes su venta y atiendes a otro. Cuando vuelva, tocas Retomar."
                />
              </p>
              <p className="text-xs font-semibold text-muted">
                {suspendedSale.count} {suspendedSale.count === 1 ? 'artículo' : 'artículos'} ·{' '}
                {formatMoney(suspendedSale.total)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResumeSale}
              className="rounded-2xl border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 px-4 py-2.5 text-sm font-black text-slate-900 shadow-lg transition-colors hover:brightness-105"
            >
              Retomar venta
            </button>
            <button
              type="button"
              onClick={() => setDiscardOpen(true)}
              className="rounded-2xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface-3"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto pb-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:overflow-hidden lg:pb-0">
        <PosProductArea
          products={products}
          loading={loading}
          error={error}
          search={search}
          onSearchChange={setSearch}
          onSearchEnter={handleSearchEnter}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categories={categories}
          filteredProducts={filteredProducts}
          outOfStockProducts={outOfStockProducts}
          cartQtyById={cartQtyById}
          highlightId={highlightId}
          onAdd={handleAddProduct}
          onIncrease={handleIncreaseQuantity}
          onDecrease={handleDecreaseQuantity}
          onRetry={retry}
          isFirstLoad={isFirstLoad}
          isSearching={isSearching}
        />

        <PosSidebar
          cart={cart}
          charging={charging}
          highlightId={highlightId}
          onIncrease={increaseQuantity}
          onDecrease={decreaseQuantity}
          onRemove={removeFromCart}
          onCharge={openPayment}
          onSuspend={handleSuspendSale}
        />
      </div>

      {paymentOpen && (
        <PaymentModal
          total={totalPrice}
          metodoPago={metodoPago}
          charging={charging}
          onMetodoPagoChange={setMetodoPago}
          onConfirm={() => void confirmPayment()}
          onCancel={() => {
            if (!charging) {
              saleKeyRef.current = null
              setPaymentOpen(false)
            }
          }}
        />
      )}

      {lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}

      <ConfirmDialog
        open={discardOpen}
        title="¿Descartar venta suspendida?"
        description={
          suspendedSale
            ? `${suspendedSale.count} ${suspendedSale.count === 1 ? 'artículo' : 'artículos'} por ${formatMoney(suspendedSale.total)} se perderán y no podrás recuperarlos.`
            : 'Los artículos guardados se perderán.'
        }
        confirmLabel="Sí, descartar"
        cancelLabel="Mantener"
        onConfirm={confirmDiscardSuspended}
        onCancel={() => setDiscardOpen(false)}
      />

      {notice && <Toast type={notice.type} message={notice.message} />}
    </div>
  )
}
