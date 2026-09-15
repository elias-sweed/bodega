import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Settings2, Trash2 } from 'lucide-react'
import { Toast } from '../components/common/Toast'
import {
  GestionProveedoresModal,
} from '../components/purchases/GestionProveedoresModal'
import {
  PROVEEDOR_GENERICO,
  ProveedorSelect,
} from '../components/purchases/ProveedorSelect'
import { useProveedores } from '../hooks/useProveedores'
import { useProducts } from '../hooks/useProducts'
import { registrarCompra } from '../services/purchases'
import type { ProductosRow } from '../types/database.types'
import { formatMoney } from '../utils/format'

type Notice = {
  type: 'success' | 'error'
  message: string
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

  const [proveedorId, setProveedorId] = useState(PROVEEDOR_GENERICO)
  const [comprobante, setComprobante] = useState('')
  const [proveedoresModalOpen, setProveedoresModalOpen] = useState(false)
  const [items, setItems] = useState<CompraItem[]>([])
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  const showNotice = useCallback((type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ type, message })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }, [])

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
    try {
      await registrarCompra({
        proveedorId: proveedorId === PROVEEDOR_GENERICO ? null : proveedorId,
        nombreProveedor,
        comprobante: comprobante.trim() || null,
        items: items.map((item) => ({
          producto_id: item.producto.id,
          cantidad: Number(item.cantidad),
          costo_total: Number(item.costoTotal),
        })),
      })
      showNotice(
        'success',
        `Compra registrada: ${items.length} ${items.length === 1 ? 'producto recibido y sumado al inventario' : 'productos recibidos y sumados al inventario'}`,
      )
      resetForm()
      refreshProductos(true)
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
    'h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400'
  const labelClass = 'mb-1 block text-sm font-semibold text-slate-600'

  return (
    <div className="flex h-full flex-col gap-5">
      <header>
        <h1 className="text-2xl font-black text-slate-900">Compras</h1>
        <p className="text-sm text-slate-500">
          Recibe mercadería: suma stock y actualiza el costo de tus productos.
        </p>
      </header>

      {proveedoresLoading ? (
        <p className="py-10 text-center text-lg text-slate-400">Cargando proveedores…</p>
      ) : proveedoresError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-rose-50 p-8 text-center">
          <p className="text-lg font-semibold text-rose-700">
            No se pudieron cargar los proveedores: {proveedoresError}
          </p>
          <button
            type="button"
            onClick={() => refreshProveedores()}
            className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Cabecera de la compra
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className={labelClass}>Proveedor</label>
                  <button
                    type="button"
                    onClick={() => setProveedoresModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Settings2 size={14} strokeWidth={2.5} aria-hidden="true" />
                    Gestionar proveedores
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
                  Comprobante (opcional)
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
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="w-full md:max-w-md">
                <label htmlFor="buscar-producto" className={labelClass}>
                  Agregar producto del inventario
                </label>
                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
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
                    <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border-2 border-slate-200 bg-white py-1 shadow-lg">
                      {suggestedProducts.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-slate-400">
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
                              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-sky-50"
                            >
                              <span className="font-medium text-slate-800">
                                {producto.nombre}
                              </span>
                              <span className="shrink-0 text-xs font-semibold text-slate-400">
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
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  <Link to="/inventario" className="text-sky-600 hover:text-sky-700">
                    ¿No encuentras el producto? Créalo en Inventario.
                  </Link>
                </p>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-10 text-center text-slate-400">
                Busca y selecciona los productos que estás recibiendo.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border-2 border-slate-100">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-semibold">Producto</th>
                      <th className="w-28 px-4 py-3 font-semibold">Cantidad</th>
                      <th className="w-40 px-4 py-3 font-semibold">Costo total (S/)</th>
                      <th className="px-4 py-3 font-semibold">Costo unitario</th>
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
                          className="border-b border-slate-100 last:border-none"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {item.producto.nombre}
                            <span className="block text-xs font-normal text-slate-400">
                              stock actual: {item.producto.stock_actual}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={item.cantidad}
                              onChange={(e) =>
                                updateItem(item.producto.id, 'cantidad', e.target.value)
                              }
                              className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={item.costoTotal}
                              onChange={(e) =>
                                updateItem(item.producto.id, 'costoTotal', e.target.value)
                              }
                              className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {costoUnitario === null
                              ? '—'
                              : formatMoney(costoUnitario)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(item.producto.id)}
                              title="Quitar de la compra"
                              aria-label={`Quitar ${item.producto.nombre} de la compra`}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-600 transition-colors hover:bg-rose-200"
                            >
                              <Trash2 size={16} strokeWidth={2.5} aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200">
                      <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-800">
                        Total de la compra
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900">
                        {formatMoney(totalCompra)}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={resetForm}
                className="h-12 rounded-2xl border-2 border-slate-200 px-6 text-base font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Limpiar
              </button>
              <button
                type="button"
                disabled={!isValid || saving}
                onClick={() => void handleSave()}
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-500 px-8 text-base font-bold text-white shadow-lg transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
                {saving ? 'Guardando…' : 'Confirmar compra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && <Toast type={notice.type} message={notice.message} />}

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