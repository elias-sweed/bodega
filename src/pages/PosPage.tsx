import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toast } from '../components/common/Toast'
import { Cart } from '../components/pos/Cart'
import { METODO_PAGO_DEFAULT, type MetodoPago } from '../components/pos/metodosPago'
import { CategoryGrid } from '../components/pos/CategoryGrid'
import { ProductGrid } from '../components/pos/ProductGrid'
import { ReceiptModal, type LastSale } from '../components/pos/ReceiptModal'
import { SearchBar } from '../components/pos/SearchBar'
import { useProducts } from '../hooks/useProducts'
import { registrarVenta } from '../services/sales'
import type { CartItem, Category } from '../types'
import type { ProductosRow } from '../types/database.types'
import { deriveCategories } from '../utils/categories'
import { formatMoney } from '../utils/format'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const SUSPENDED_SALE_KEY = 'pos_venta_suspendida'

function readSuspendedSale(): CartItem[] | null {
  try {
    const raw = window.localStorage.getItem(SUSPENDED_SALE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeSuspendedSale(items: CartItem[]): void {
  window.localStorage.setItem(SUSPENDED_SALE_KEY, JSON.stringify(items))
}

function clearSuspendedSale(): void {
  window.localStorage.removeItem(SUSPENDED_SALE_KEY)
}

export function PosPage() {
  const { products, loading, error, refresh } = useProducts()
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [charging, setCharging] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [suspendedSale, setSuspendedSale] = useState<CartItem[] | null>(() =>
    readSuspendedSale(),
  )
  const [lastSale, setLastSale] = useState<LastSale | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(METODO_PAGO_DEFAULT)
  const noticeTimer = useRef<number | undefined>(undefined)

  const showNotice = useCallback((type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ type, message })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(noticeTimer.current)
  }, [])

  const categories = useMemo(() => deriveCategories(products), [products])

  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0

  const filteredProducts = useMemo((): ProductosRow[] => {
    const source = isSearching
      ? products
      : selectedCategory
        ? products.filter(
            (product) => product.categoria === selectedCategory.id,
          )
        : []

    return source.filter((product) => {
      const name = product.nombre.toLowerCase()
      const barcode = product.codigo_barras?.toLowerCase() ?? ''
      return name.includes(query) || barcode.includes(query)
    })
  }, [products, query, isSearching, selectedCategory])

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

  const handleSearchEnter = (): void => {
    if (!query) return
    const match = products.find(
      (product) =>
        product.codigo_barras?.toLowerCase() === query ||
        product.nombre.toLowerCase() === query,
    )
    if (match) {
      addProduct(match)
      setSearch('')
    }
  }

  const handleCharge = async (): Promise<void> => {
    if (cart.length === 0 || charging) return
    setCharging(true)
    try {
      const result = await registrarVenta(cart, metodoPago)
      setLastSale({
        venta_id: result.venta_id,
        total: result.total,
        fecha: new Date().toISOString(),
        items: cart,
        metodo_pago: metodoPago,
      })
      setCart([])
      setSearch('')
      showNotice('success', `Venta por ${formatMoney(result.total)} registrada`)
      refresh(true)
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error
          ? cause.message
          : 'No se pudo registrar la venta',
      )
    } finally {
      setCharging(false)
    }
  }

  const handleSuspend = (): void => {
    if (cart.length === 0) return
    const saved = [...cart]
    writeSuspendedSale(saved)
    setSuspendedSale(saved)
    setCart([])
    showNotice('success', `Venta suspendida (${saved.length} ${
      saved.length === 1 ? 'artículo' : 'artículos'
    })`)
  }

  const handleResume = (): void => {
    if (!suspendedSale) return
    setCart(suspendedSale)
    clearSuspendedSale()
    setSuspendedSale(null)
    showNotice('success', 'Venta retomada')
  }

  const handleDiscardSuspended = (): void => {
    const ok = window.confirm(
      '¿Descartar la venta suspendida?\nLos artículos guardados se perderán.',
    )
    if (!ok) return
    clearSuspendedSale()
    setSuspendedSale(null)
    showNotice('success', 'Venta suspendida descartada')
  }

  const retry = useCallback((): void => refresh(), [refresh])

  const content = loading ? (
    <p className="py-10 text-center text-lg text-slate-400">
      Cargando productos…
    </p>
  ) : error ? (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-rose-50 p-8 text-center">
      <p className="text-lg font-semibold text-rose-700">
        No se pudieron cargar los productos: {error}
      </p>
      <button
        type="button"
        onClick={retry}
        className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
      >
        Reintentar
      </button>
    </div>
  ) : isSearching ? (
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
      categories={categories}
      onSelect={(category) => {
        setSelectedCategory(category)
        setSearch('')
      }}
    />
  )

  return (
    <div className="flex h-full flex-col gap-4">
      {suspendedSale && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              ⏸️
            </span>
            <div>
              <p className="font-bold text-amber-800">Hay una venta suspendida</p>
              <p className="text-sm text-amber-700">
                {suspendedSale.length} {suspendedSale.length === 1 ? 'artículo' : 'artículos'} ·{' '}
                {formatMoney(
                  suspendedSale.reduce(
                    (sum, item) =>
                      sum + item.product.precio_venta * item.quantity,
                    0,
                  ),
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResume}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-amber-600"
            >
              Retomar venta
            </button>
            <button
              type="button"
              onClick={handleDiscardSuspended}
              className="rounded-xl border-2 border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
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

        <div className="min-h-0">
          <Cart
            items={cart}
            charging={charging}
            metodoPago={metodoPago}
            onMetodoPagoChange={setMetodoPago}
            onIncrease={increaseQuantity}
            onDecrease={decreaseQuantity}
            onCharge={() => void handleCharge()}
            onSuspend={handleSuspend}
          />
        </div>
      </div>

      {lastSale && (
        <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />
      )}

      {notice && <Toast type={notice.type} message={notice.message} />}
    </div>
  )
}