import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Plus, RotateCcw, Search, Settings2, Trash2 } from 'lucide-react'
import { Toast } from '../components/common/Toast'
import {
  GestionProveedoresModal,
} from '../components/purchases/GestionProveedoresModal'
import {
  PROVEEDOR_GENERICO,
  ProveedorSelect,
} from '../components/purchases/ProveedorSelect'
import { PurchasesSkeleton } from '../components/purchases/PurchasesSkeleton'
import { useProveedores } from '../hooks/useProveedores'
import { useProducts } from '../hooks/useProducts'
import { emitDataChanged } from '../services/dataEvents'
import { registrarCompra } from '../services/purchases'
import type { ProductosRow } from '../types/database.types'
import { formatMoney } from '../utils/format'

type Notice = {
  type: 'success' | 'error'
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface CompraItem {
  producto: ProductosRow
  cantidad: string
  costoTotal: string
}

export function PurchasesPage() {
  const { proveedores, loading: proveedoresLoading, error: proveedoresError, refresh: refreshProveedores, addProveedor, removeProveedor } =
    useProveedores()
  const { products, refresh: refreshProductos } = useProducts()

  const navigate = useNavigate()
  const [proveedorId, setProveedorId] = useState(PROVEEDOR_GENERICO)
  const [comprobante, setComprobante] = useState('')
  const [proveedoresModalOpen, setProveedoresModalOpen] = useState(false)
  const [items, setItems] = useState<CompraItem[]>([])
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const purchaseKeyRef = useRef<string | null>(null)
  const purchaseFingerprintRef = useRef<string | null>(null)

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

  const addedProductIds = useMemo(
    () => new Set(items.map((item) => item.producto.id)),
    [items],
  )

  const suggestedProducts = useMemo(() => {
    const query = search.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const list = query === '' ? products : products.filter(
      (producto) =>
        producto.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(query) ||
        (producto.codigo_barras ?? '').toLowerCase().includes(query),
    )
    return list.filter((producto) => !addedProductIds.has(producto.id)).slice(0, 8)
  }, [products, search, addedProductIds])

  const totalCompra = items.reduce((total, item) => {
    const costo = Number(item.costoTotal)
    return total + (Number.isFinite(costo) && costo > 0 ? costo : 0)
  }, 0)

  const isValid =
    proveedorId !== '' &&
    items.length > 0 &&
    items.every((item) => {
      const cantidad = Number(item.cantidad)
      const costo = Number(item.costoTotal)
      return (
        Number.isInteger(cantidad) &&
        cantidad >= 1 &&
        Number.isFinite(costo) &&
        costo >= 0
      )
    })

  const addItem = (producto: ProductosRow): void => {
    if (addedProductIds.has(producto.id)) return
    setItems((current) => [...current, { producto, cantidad: '', costoTotal: '' }])
    setSearch('')
    setSearchOpen(false)
  }

  const updateItem = (productoId: string, field: 'cantidad' | 'costoTotal', value: string): void => {
    setItems((current) =>
      current.map((item) =>
        item.producto.id === productoId ? { ...item, [field]: value } : item,
      ),
    )
  }

  const removeItem = (productoId: string): void => {
    setItems((current) => current.filter((item) => item.producto.id !== productoId))
  }

  const resetForm = (): void => {
    purchaseKeyRef.current = null
    purchaseFingerprintRef.current = null
    setProveedorId(PROVEEDOR_GENERICO)
    setComprobante('')
    setItems([])
    setSearch('')
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

  const inputClass =
    'h-12 w-full rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-muted/70 focus:border-line-strong focus:bg-surface-2'
  const labelClass =
    'mb-1 block text-xs font-extrabold uppercase tracking-[0.16em] text-muted'

  const isFirstLoad = proveedoresLoading && proveedores.length === 0

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-5">
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
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-black text-ink backdrop-blur-xl">
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
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
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
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
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
                    <ul className="fade-in absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-line bg-surface py-1.5 shadow-sm backdrop-blur-2xl">
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
                              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface"
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
                <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-black text-ink backdrop-blur-xl">
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-surface-sub px-5 py-10 text-center">
                <p className="text-sm font-extrabold tracking-tight text-ink">
                  Aquí aparecerá lo que estás recibiendo
                </p>
                <p className="mt-1 text-xs font-medium text-muted">
                  Escribe arriba el nombre del producto y tócalo para agregarlo a la lista.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-line bg-surface-sub backdrop-blur-xl">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-surface text-[11px] font-extrabold uppercase tracking-widest text-muted">
                      <th className="px-4 py-3.5">Producto</th>
                      <th className="w-32 px-4 py-3.5">¿Cuántas unidades?</th>
                      <th className="w-44 px-4 py-3.5">¿Costo total? (S/)</th>
                      <th className="px-4 py-3.5">Cada uno sale a</th>
                      <th className="w-16 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const cantidad = Number(item.cantidad)
                      const costo = Number(item.costoTotal)
                      const costoUnitario =
                        Number.isInteger(cantidad) &&
                        cantidad >= 1 &&
                        Number.isFinite(costo) &&
                        costo >= 0
                          ? costo / cantidad
                          : null
                      return (
                        <tr
                          key={item.producto.id}
                          className="fade-in border-b border-line transition-colors odd:bg-surface-sub last:border-none hover:bg-surface"
                        >
                          <td className="px-4 py-3.5">
                            <p className="text-base font-extrabold tracking-tight text-ink">
                              {item.producto.nombre}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold tabular-nums text-muted">
                              Hay {item.producto.stock_actual}
                              {Number.isInteger(Number(item.cantidad)) &&
                                Number(item.cantidad) >= 1 && (
                                  <span className="font-black text-profit">
                                    {' '}
                                    → quedará en {item.producto.stock_actual + Number(item.cantidad)}
                                  </span>
                                )}
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={item.cantidad}
                              onChange={(e) =>
                                updateItem(item.producto.id, 'cantidad', e.target.value)
                              }
                              aria-label={`Unidades que llegaron de ${item.producto.nombre}`}
                              className="h-11 w-full rounded-xl border-2 border-line-strong bg-surface-2 px-3 text-base font-black tabular-nums text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:font-semibold placeholder:text-muted/70 focus:border-emerald-300/70 focus:bg-surface-3"
                              placeholder="Ej. 24"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={item.costoTotal}
                              onChange={(e) =>
                                updateItem(item.producto.id, 'costoTotal', e.target.value)
                              }
                              aria-label={`Costo total pagado por ${item.producto.nombre}`}
                              className="h-11 w-full rounded-xl border-2 border-line-strong bg-surface-2 px-3 text-base font-black tabular-nums text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:font-semibold placeholder:text-muted/70 focus:border-emerald-300/70 focus:bg-surface-3"
                              placeholder="Ej. 48.00"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            {costoUnitario === null
                              ? <span className="text-sm font-bold text-muted">—</span>
                              : (
                                <span className="inline-block rounded-full border border-profit/40 bg-profit/15 px-3 py-1.5 text-sm font-black tabular-nums text-profit">
                                  {formatMoney(costoUnitario)}
                                </span>
                              )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(item.producto.id)}
                              title="Quitar de la compra"
                              aria-label={`Quitar ${item.producto.nombre} de la compra`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-400/15 text-loss transition-all duration-200 hover:bg-rose-200/60 active:scale-90"
                            >
                              <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-profit/40 bg-profit/15">
                      <td colSpan={2} className="px-4 py-4 text-right text-sm font-bold uppercase tracking-widest text-muted">
                        Total de la compra
                      </td>
                      <td className="px-4 py-4 text-xl font-black tracking-tight text-ink">
                        {formatMoney(totalCompra)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

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
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-emerald-200/30 bg-emerald-500 px-8 text-base font-black text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-muted disabled:shadow-none disabled:hover:translate-y-0"
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
