import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Plus, RotateCcw, Search, Settings2 } from 'lucide-react'
import { Toast } from '../components/common/Toast'
import {
  GestionProveedoresModal,
} from '../components/purchases/GestionProveedoresModal'
import {
  PROVEEDOR_GENERICO,
  ProveedorSelect,
} from '../components/purchases/ProveedorSelect'
import { PurchaseItemsTable } from '../components/purchases/PurchaseItemsTable'
import { PurchasesSkeleton } from '../components/purchases/PurchasesSkeleton'
import { usePurchaseForm } from '../hooks/usePurchaseForm'
import { useProveedores } from '../hooks/useProveedores'
import { useProducts } from '../hooks/useProducts'
import { emitDataChanged } from '../services/dataEvents'
import { registrarCompra } from '../services/purchases'
import { formatMoney } from '../utils/format'
import { inputClass, labelClass } from '../styles/formClasses'

type Notice = {
  type: 'success' | 'error'
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function PurchasesPage() {
  const { proveedores, loading: proveedoresLoading, error: proveedoresError, refresh: refreshProveedores, addProveedor, removeProveedor } =
    useProveedores()
  const { products, refresh: refreshProductos } = useProducts()

  const navigate = useNavigate()
  const [proveedorId, setProveedorId] = useState(PROVEEDOR_GENERICO)
  const [comprobante, setComprobante] = useState('')
  const [proveedoresModalOpen, setProveedoresModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const purchaseKeyRef = useRef<string | null>(null)
  const purchaseFingerprintRef = useRef<string | null>(null)

  const {
    items,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    totalCompra,
    isValid,
    suggestedProducts,
    search,
    setSearch,
    searchOpen,
    setSearchOpen,
  } = usePurchaseForm(products)

  const showNotice = useCallback(
    (type: Notice['type'], message: string, action?: Notice['action']): void => {
      window.clearTimeout(noticeTimer.current)
      setNotice({ type, message, action })
      noticeTimer.current = window.setTimeout(() => setNotice(null), 6000)
    },
    [],
  )

  useEffect(() => {
    return () => window.clearTimeout(noticeTimer.current)
  }, [])

  const resetForm = (): void => {
    purchaseKeyRef.current = null
    purchaseFingerprintRef.current = null
    setProveedorId(PROVEEDOR_GENERICO)
    setComprobante('')
    clearItems()
  }

  const handleEliminarProveedor = async (id: string): Promise<void> => {
    await removeProveedor(id)
    if (proveedorId === id) {
      setProveedorId(PROVEEDOR_GENERICO)
    }
    showNotice('success', 'Proveedor eliminado')
  }

  const handleSave = async (): Promise<void> => {
    if (!isValid || saving) return
    setSaving(true)
    const proveedorReal = proveedores.find((proveedor) => proveedor.id === proveedorId)
    const nombreProveedor = proveedorReal ? proveedorReal.nombre : null
    const itemsPayload = items.map((item) => ({
      producto_id: item.producto.id,
      cantidad: Number(item.cantidad),
      costo_total: Number(item.costoTotal),
    }))
    const fingerprint = JSON.stringify({
      proveedorId,
      comprobante: comprobante.trim(),
      items: itemsPayload,
    })
    if (purchaseFingerprintRef.current !== fingerprint) {
      purchaseKeyRef.current = crypto.randomUUID()
      purchaseFingerprintRef.current = fingerprint
    }
    const idempotencyKey = purchaseKeyRef.current ?? crypto.randomUUID()
    purchaseKeyRef.current = idempotencyKey
    try {
      await registrarCompra({
        proveedorId: proveedorId === PROVEEDOR_GENERICO ? null : proveedorId,
        nombreProveedor,
        comprobante: comprobante.trim() || null,
        items: itemsPayload,
        idempotencyKey,
      })
      showNotice(
        'success',
        `Se sumó al inventario: ${items.map((item) => `${item.producto.nombre} (+${item.cantidad})`).join(', ')}.`,
        {
          label: 'Ver en inventario',
          onClick: () =>
            navigate('/inventario', {
              state: { recentIds: items.map((item) => item.producto.id) },
            }),
        },
      )
      purchaseKeyRef.current = null
      purchaseFingerprintRef.current = null
      resetForm()
      refreshProductos(true)
      emitDataChanged()
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo registrar la compra',
      )
    } finally {
      setSaving(false)
    }
  }

  const isFirstLoad = proveedoresLoading && proveedores.length === 0

  return (
    <div className="compras-pos mx-auto flex h-full w-full max-w-6xl flex-col gap-5 bg-transparent">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Mercadería
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink">
            Compras
          </h1>
          <p className="mt-1 text-sm font-medium text-muted">
            Recibe mercadería: suma stock y actualiza el costo de tus productos.
          </p>
        </div>
        {items.length > 0 && (
          <span className="rounded-full border border-amber-300/25 bg-surface-2 px-3 py-1 text-xs font-black text-ink">
            {items.length} {items.length === 1 ? 'ítem' : 'ítems'} · {formatMoney(totalCompra)}
          </span>
        )}
      </header>

      {isFirstLoad ? (
        <PurchasesSkeleton />
      ) : proveedoresError && proveedores.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-400/30 bg-rose-400/10 p-8 text-center shadow-sm backdrop-blur-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/30 text-loss">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <p className="text-lg font-extrabold tracking-tight text-ink">
            No se pudieron cargar los proveedores
          </p>
          <p className="text-sm font-medium text-muted">{proveedoresError}</p>
          <button
            type="button"
            onClick={() => refreshProveedores()}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/40 bg-rose-500 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-rose-400"
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : (
        <div className="fade-in flex flex-col gap-5">
          <section className="rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl">
            <h2 className="mb-1 flex items-center gap-2 text-base font-black tracking-tight text-ink">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-xs font-black text-ink">
                1
              </span>
              Datos de la compra
            </h2>
            <p className="mb-4 text-xs font-medium text-muted">
              ¿A quién le compraste esta mercadería?
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className={labelClass}>Proveedor</span>
                  <button
                    type="button"
                    onClick={() => setProveedoresModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-extrabold text-ink backdrop-blur-xl transition-all duration-200 hover:bg-surface-3 hover:text-ink active:scale-95"
                  >
                    <Settings2 size={14} strokeWidth={2.5} aria-hidden="true" />
                    Ver o borrar proveedores
                  </button>
                </div>
                <ProveedorSelect
                  proveedores={proveedores}
                  value={proveedorId}
                  onChange={setProveedorId}
                  onAddProveedor={async (nombre, empresa) =>
                    addProveedor({ nombre, empresa: empresa ?? null })
                  }
                />
              </div>
              <div>
                <label htmlFor="comprobante" className={labelClass}>
                  Boleta o factura (si tienes)
                </label>
                <input
                  id="comprobante"
                  value={comprobante}
                  onChange={(e) => setComprobante(e.target.value)}
                  className={inputClass}
                  placeholder="Ej. Boleta 001-000123, Factura F001-234"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl">
            <h2 className="mb-1 flex items-center gap-2 text-base font-black tracking-tight text-ink">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-xs font-black text-ink">
                2
              </span>
              ¿Qué productos llegaron?
            </h2>
            <p className="mb-4 text-xs font-medium text-muted">
              Busca cada producto, di cuántas unidades llegaron y cuánto costó todo.
              <span className="mt-0.5 block font-bold text-gold">
                Cuenta uno por uno: si vino 1 caja con 24, escribe 24 (no 1).
              </span>
            </p>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="w-full md:max-w-md">
                <label htmlFor="buscar-producto" className={labelClass}>
                  Agregar producto del inventario
                </label>
                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-200/80"
                    aria-hidden="true"
                  />
                  <input
                    id="buscar-producto"
                    type="search"
                    autoComplete="off"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setSearchOpen(true)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setSearchOpen(false)}
                    className={`${inputClass} pl-11`}
                    placeholder="Buscar por nombre o código de barras…"
                  />

                  {searchOpen && (
                    <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-line bg-surface py-1.5 shadow-[0_24px_60px_-24_rgba(0,0,0,0.95)]">
                      {suggestedProducts.length === 0 ? (
                        <li className="px-4 py-3 text-sm font-medium text-muted">
                          Sin coincidencias en el inventario.
                        </li>
                      ) : (
                        suggestedProducts.map((producto) => (
                          <li key={producto.id}>
                            <button
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                addItem(producto)
                              }}
                              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                            >
                              <span className="truncate text-sm font-extrabold tracking-tight text-ink">
                                {producto.nombre}
                              </span>
                              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted">
                                {producto.codigo_barras ?? ''} · stock:{' '}
                                {producto.stock_actual}
                              </span>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold text-muted">
                  ¿No sale en la lista?{' '}
                  <Link
                    to={search.trim() ? `/inventario?nuevo=${encodeURIComponent(search.trim())}` : '/inventario'}
                    className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-extrabold text-ink backdrop-blur-xl transition-all duration-200 hover:bg-surface-3 active:scale-95"
                  >
                    <Plus size={13} strokeWidth={3} aria-hidden="true" />
                    {search.trim()
                      ? `Crear "${search.trim().slice(0, 24)}${search.trim().length > 24 ? '…' : ''}"`
                      : 'Crear producto nuevo'}
                  </Link>
                </p>
              </div>
              {items.length > 0 && (
                <span className="rounded-full border border-amber-300/25 bg-surface-2 px-3 py-1 text-xs font-black text-ink">
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </span>
              )}
            </div>

            <PurchaseItemsTable
              items={items}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              totalCompra={totalCompra}
            />

            <div className="mt-5 flex flex-wrap justify-end gap-2.5 border-t border-line pt-5">
              <p className="mr-auto self-center text-xs font-semibold text-muted">
                Paso 3: revisa que todo esté bien y guarda.
              </p>
              <button
                type="button"
                onClick={resetForm}
                className="h-12 rounded-2xl border border-line bg-surface px-6 text-base font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98]"
              >
                Empezar de nuevo
              </button>
              <button
                type="button"
                disabled={!isValid || saving}
                onClick={() => void handleSave()}
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 px-8 text-base font-black text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
                {saving ? 'Guardando…' : 'Guardar compra'}
              </button>
            </div>
          </section>
        </div>
      )}

      {notice && <Toast type={notice.type} message={notice.message} action={notice.action} />}

      {proveedoresModalOpen && (
        <GestionProveedoresModal
          proveedores={proveedores}
          onClose={() => setProveedoresModalOpen(false)}
          onEliminar={handleEliminarProveedor}
        />
      )}
    </div>
  )
}
