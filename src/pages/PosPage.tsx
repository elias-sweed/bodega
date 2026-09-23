import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, PauseCircle, RotateCcw } from 'lucide-react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Toast } from '../components/common/Toast'
import { Cart } from '../components/pos/Cart'
import { METODO_PAGO_DEFAULT, type MetodoPago } from '../components/pos/metodosPago'
import { CategoryGrid } from '../components/pos/CategoryGrid'
import { PaymentModal } from '../components/pos/PaymentModal'
import { PosSkeleton } from '../components/pos/PosSkeleton'
import { ProductGrid } from '../components/pos/ProductGrid'
import { ReceiptModal, type LastSale } from '../components/pos/ReceiptModal'
import { SearchBar } from '../components/pos/SearchBar'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { emitDataChanged } from '../services/dataEvents'
import { applyStockChanges } from '../services/productsCache'
import { getStockShortIds, registrarVenta, VentaError } from '../services/sales'
import type { CartItem, Category } from '../types'
import type { ProductosRow } from '../types/database.types'
import { deriveCategories } from '../utils/categories'
import { getFriendlyError } from '../utils/errors'
import { formatMoney } from '../utils/format'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const SUSPENDED_SALE_KEY_PREFIX = 'pos_venta_suspendida_v2'

interface SuspendedSale {
  items: { id: string; cantidad: number }[]
  metodoPago: MetodoPago | null
  total: number
  count: number
}

function isLegacySuspendedSale(value: unknown): value is CartItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        'product' in item &&
        'quantity' in item,
    )
  )
}

function readSuspendedSale(key: string): SuspendedSale | null {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)

    if (isLegacySuspendedSale(parsed)) {
      return {
        items: parsed.map((item) => ({
          id: item.product.id,
          cantidad: item.quantity,
        })),
        metodoPago: null,
        total: parsed.reduce(
          (sum, item) => sum + item.product.precio_venta * item.quantity,
          0,
        ),
        count: parsed.reduce((sum, item) => sum + item.quantity, 0),
      }
    }

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'items' in parsed &&
      Array.isArray((parsed as SuspendedSale).items) &&
      (parsed as SuspendedSale).items.every(
        (item) =>
          item !== null &&
          typeof item === 'object' &&
          typeof (item as { id?: unknown }).id === 'string' &&
          typeof (item as { cantidad?: unknown }).cantidad === 'number',
      )
    ) {
      return parsed as SuspendedSale
    }

    return null
  } catch {
    return null
  }
}

function writeSuspendedSale(key: string, sale: SuspendedSale): void {
  window.localStorage.setItem(key, JSON.stringify(sale))
}

function clearSuspendedSale(key: string): void {
  window.localStorage.removeItem(key)
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  const suspendedSaleKey = `${SUSPENDED_SALE_KEY_PREFIX}:${user?.id ?? 'anon'}`
  const { products, loading, error, refresh } = useProducts()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [charging, setCharging] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [suspendedSale, setSuspendedSale] = useState<SuspendedSale | null>(() =>
    readSuspendedSale(suspendedSaleKey),
  )
  const [lastSale, setLastSale] = useState<LastSale | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(METODO_PAGO_DEFAULT)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const highlightTimer = useRef<number | undefined>(undefined)
  const saleKeyRef = useRef<string | null>(null)

  const flashHighlight = useCallback((productId: string): void => {
    setHighlightId(productId)
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 1200)
  }, [])

  const showNotice = useCallback((type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ type, message })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }, [])

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

  const cartQtyById = useMemo(
    () => new Map(cart.map((item) => [item.product.id, item.quantity])),
    [cart],
  )

  // En móvil el carrito aparece solo cuando hay productos: al agregar el
  // primero lo llevamos a la vista para que se note.
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

  const addProduct = (product: ProductosRow): void => {
    if (product.stock_actual <= 0) return
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock_actual) {
          return current
        }
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...current, { product, quantity: 1 }]
    })
    flashHighlight(product.id)
  }

  const increaseQuantity = (productId: string): void => {
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) {
          return item
        }
        if (item.quantity >= item.product.stock_actual) {
          return item
        }
        return { ...item, quantity: item.quantity + 1 }
      }),
    )
    flashHighlight(productId)
  }

  const decreaseQuantity = (productId: string): void => {
    setCart((current) =>
      current.flatMap((item) =>
        item.product.id === productId
          ? item.quantity > 1
            ? [{ ...item, quantity: item.quantity - 1 }]
            : []
          : [item],
      ),
    )
  }

  const removeFromCart = (productId: string): void => {
    setCart((current) => current.filter((item) => item.product.id !== productId))
    if (highlightId === productId) {
      setHighlightId(null)
    }
  }

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
    setCharging(true)
    try {
      const idempotencyKey = saleKeyRef.current ?? crypto.randomUUID()
      saleKeyRef.current = idempotencyKey
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
      setCart([])
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
      saleKeyRef.current = null
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

  const handleSuspend = (): void => {
    if (cart.length === 0) return
    const sale: SuspendedSale = {
      items: cart.map((item) => ({
        id: item.product.id,
        cantidad: item.quantity,
      })),
      metodoPago,
      total: cart.reduce(
        (sum, item) => sum + item.product.precio_venta * item.quantity,
        0,
      ),
      count: cart.reduce((sum, item) => sum + item.quantity, 0),
    }
    writeSuspendedSale(suspendedSaleKey, sale)
    setSuspendedSale(sale)
    setCart([])
    showNotice('success', `Venta suspendida (${sale.count} ${
      sale.count === 1 ? 'artículo' : 'artículos'
    })`)
  }

  const handleResume = (): void => {
    if (!suspendedSale) return
    const productsById = new Map(products.map((product) => [product.id, product]))
    const cartRestored: CartItem[] = []
    let skipped = 0
    let clamped = 0
    for (const { id, cantidad } of suspendedSale.items) {
      const product = productsById.get(id)
      if (!product) {
        skipped += 1
        continue
      }
      const quantity = Math.min(cantidad, product.stock_actual)
      if (quantity <= 0) {
        skipped += 1
        continue
      }
      if (quantity < cantidad) {
        clamped += 1
      }
      cartRestored.push({ product, quantity })
    }
    clearSuspendedSale(suspendedSaleKey)
    setSuspendedSale(null)

    if (cartRestored.length === 0) {
      showNotice(
        'error',
        'No se pudo retomar la venta: sus productos ya no existen o no tienen stock.',
      )
      return
    }

    if (suspendedSale.metodoPago) {
      setMetodoPago(suspendedSale.metodoPago)
    }
    setCart(cartRestored)
    showNotice(
      'success',
      clamped > 0 || skipped > 0
        ? `Venta retomada con precios y stock actuales (${
            clamped > 0 ? 'se ajustó alguna cantidad' : 'se omitieron productos sin stock'
          })`
        : 'Venta retomada con precios actuales',
    )
  }

  const handleDiscardSuspended = (): void => {
    if (!suspendedSale) return
    setDiscardOpen(true)
  }

  const confirmDiscardSuspended = (): void => {
    clearSuspendedSale(suspendedSaleKey)
    setSuspendedSale(null)
    setDiscardOpen(false)
    showNotice('success', 'Venta suspendida descartada')
  }

  const retry = useCallback((): void => refresh(), [refresh])

  const isFirstLoad = loading && products.length === 0

  const content = isFirstLoad ? (
    <PosSkeleton />
  ) : error && products.length === 0 ? (
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
        onClick={retry}
        className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-lg transition-transform duration-300 hover:-translate-y-0.5"
      >
        <RotateCcw size={15} aria-hidden="true" />
        Reintentar
      </button>
    </div>
  ) : isSearching ? (
    <ProductGrid
      products={filteredProducts}
      title="Resultados de búsqueda"
      cartQuantities={cartQtyById}
      highlightId={highlightId}
      onAdd={addProduct}
      onIncrease={increaseQuantity}
      onDecrease={decreaseQuantity}
    />
  ) : selectedCategory ? (
    <div className="fade-in">
      <button
        type="button"
        onClick={() => setSelectedCategory(null)}
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
        onAdd={addProduct}
        onIncrease={increaseQuantity}
        onDecrease={decreaseQuantity}
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
            setSelectedCategory(category)
            setSearch('')
          }}
        />
      )}
      {outOfStockProducts.length > 0 && (
        <ProductGrid
          products={outOfStockProducts}
          title="Productos agotados"
          cartQuantities={cartQtyById}
          highlightId={highlightId}
          onAdd={addProduct}
          onIncrease={increaseQuantity}
          onDecrease={decreaseQuantity}
        />
      )}
    </div>
  )

  return (
    <div className="caja-pos mx-auto flex h-full w-full max-w-7xl flex-col gap-4 bg-transparent">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Punto de venta
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink ">
            Caja
          </h1>
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
              onClick={handleResume}
              className="rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 px-4 py-2.5 text-sm font-black text-slate-900 shadow-lg transition-colors hover:brightness-105"
            >
              Retomar venta
            </button>
            <button
              type="button"
              onClick={handleDiscardSuspended}
              className="rounded-2xl border border-line bg-surface-2 px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-surface-3"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto pb-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:overflow-hidden lg:pb-0">
        <section className="flex min-h-0 flex-col gap-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            onEnter={handleSearchEnter}
          />
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{content}</div>
        </section>

        <div ref={cartSectionRef} className="min-h-0 scroll-mt-2">
          <Cart
            items={cart}
            charging={charging}
            highlightId={highlightId}
            onIncrease={increaseQuantity}
            onDecrease={decreaseQuantity}
            onRemove={removeFromCart}
            onCharge={openPayment}
            onSuspend={handleSuspend}
          />
        </div>
      </div>

      {paymentOpen && (
        <PaymentModal
          total={cart.reduce(
            (sum, item) => sum + item.product.precio_venta * item.quantity,
            0,
          )}
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