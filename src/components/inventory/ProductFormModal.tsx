import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Calculator, Check, ChevronDown, TrendingUp, X } from 'lucide-react'
import { fetchProductByName, fetchProductCategories } from '../../services/products'
import type { ProductosInsert, ProductosRow } from '../../types/database.types'
import { formatMoney, toTitleCase } from '../../utils/format'

interface ProductFormModalProps {
  onClose: () => void
  onSubmit: (product: ProductosInsert) => Promise<void>
  initial?: ProductosRow | null
  isFromPurchase?: boolean
}

interface FormValues {
  nombre: string
  categoria: string
  codigo_barras: string
  precio_venta: string
  costo: string
  stock_actual: string
  stock_minimo: string
}

const EMPTY_VALUES: FormValues = {
  nombre: '',
  categoria: '',
  codigo_barras: '',
  precio_venta: '',
  costo: '',
  stock_actual: '',
  stock_minimo: '',
}

const STOCK_MINIMO_DEFAULT = 5
const DEFAULT_CATEGORIES = [
  'General',
  'Bebidas',
  'Abarrotes',
  'Snacks',
  'Lácteos',
  'Limpieza',
]

const ERROR_BARCODE_DUPLICADO =
  '⚠️ Este código de barras ya está asignado a otro producto.'

function isDuplicateBarcodeError(cause: unknown): boolean {
  const message = (
    cause instanceof Error ? cause.message : String(cause)
  ).toLowerCase()
  return (
    message.includes('duplicate key') ||
    message.includes('23505') ||
    message.includes('unique constraint')
  )
}

export function ProductFormModal({
  onClose,
  onSubmit,
  initial,
  isFromPurchase = false,
}: ProductFormModalProps) {
  const [values, setValues] = useState<FormValues>(() => {
    if (isFromPurchase || !initial) {
      return { ...EMPTY_VALUES, stock_actual: '0' }
    }
    return {
      nombre: initial.nombre,
      categoria: initial.categoria,
      codigo_barras: initial.codigo_barras ?? '',
      precio_venta: String(initial.precio_venta),
      costo: String(initial.costo),
      stock_actual: String(initial.stock_actual),
      stock_minimo: String(initial.stock_minimo),
    }
  })
  const [categories, setCategories] = useState<string[]>([])
  const [categoriaOpen, setCategoriaOpen] = useState(false)
  const [paqueteOpen, setPaqueteOpen] = useState(false)
  const [paquetePrecio, setPaquetePrecio] = useState('')
  const [paqueteUnidades, setPaqueteUnidades] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const loadCategories = async (): Promise<void> => {
      try {
        const list = await fetchProductCategories()
        if (active) setCategories(list.length > 0 ? list : DEFAULT_CATEGORIES)
      } catch {
        if (active) setCategories(DEFAULT_CATEGORIES)
      }
    }
    void loadCategories()
    return () => {
      active = false
    }
  }, [])

  const allCategories = useMemo(() => {
    const unique = new Set<string>()
    if (initial?.categoria.trim()) unique.add(initial.categoria.trim())
    for (const name of categories) {
      if (name.trim()) unique.add(name.trim())
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es'))
  }, [categories, initial])

  const filteredCategories = useMemo(() => {
    const query = values.categoria.trim().toLowerCase()
    if (query === '') return allCategories
    return allCategories.filter((name) => name.toLowerCase().includes(query))
  }, [allCategories, values.categoria])

  const isExistingCategory = allCategories.some(
    (name) => name.toLowerCase() === values.categoria.trim().toLowerCase(),
  )

  const setField = (field: keyof FormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const precioNum = values.precio_venta === '' ? Number.NaN : Number(values.precio_venta)
  const costNum = values.costo === '' ? Number.NaN : Number(values.costo)
  const margin =
    Number.isFinite(precioNum) && precioNum > 0 && Number.isFinite(costNum)
      ? ((precioNum - costNum) / precioNum) * 100
      : null
  const marginClass =
    margin !== null
      ? margin < 0
        ? 'bg-rose-100 text-rose-700'
        : margin < 20
          ? 'bg-amber-100 text-amber-700'
          : 'bg-emerald-100 text-emerald-700'
      : ''

  const paquetePrecioNum = paquetePrecio === '' ? Number.NaN : Number(paquetePrecio)
  const paqueteUnidadesNum = paqueteUnidades === '' ? Number.NaN : Number(paqueteUnidades)
  const costoCalc =
    Number.isFinite(paquetePrecioNum) &&
    paquetePrecioNum > 0 &&
    Number.isFinite(paqueteUnidadesNum) &&
    paqueteUnidadesNum > 0
      ? paquetePrecioNum / paqueteUnidadesNum
      : null

  const applyCalculatedCost = (precio: string, unidades: string): void => {
    const p = precio === '' ? Number.NaN : Number(precio)
    const u = unidades === '' ? Number.NaN : Number(unidades)
    if (Number.isFinite(p) && p > 0 && Number.isFinite(u) && u > 0) {
      setField('costo', (p / u).toFixed(2))
    }
  }

  const showStockField = !isFromPurchase && Boolean(initial)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)

    if (!values.nombre.trim()) {
      setError('⚠️ Ingresa el nombre del producto para continuar.')
      return
    }

    const categoria = toTitleCase(values.categoria.trim())
    if (!categoria) {
      setError('Por favor, escribe el nombre de la categoría.')
      return
    }

    const precioVenta = Number(values.precio_venta)
    if (values.precio_venta.trim() === '' || !Number.isFinite(precioVenta) || precioVenta < 0) {
      setError('Por favor, ingresa un precio de venta válido.')
      return
    }

    if (!isFromPurchase) {
      const costo = Number(values.costo)
      if (values.costo.trim() === '' || !Number.isFinite(costo) || costo < 0) {
        setError('Por favor, ingresa el costo del producto (o usa "Calcular por paquete/caja").')
        return
      }
    }

    if (showStockField) {
      const stockActual = Number(values.stock_actual)
      if (values.stock_actual.trim() === '' || !Number.isFinite(stockActual) || stockActual < 0) {
        setError('Por favor, ingresa un stock actual válido.')
        return
      }
    }

    setSubmitting(true)
    try {
      const nombre = toTitleCase(values.nombre.trim())
      const existing = await fetchProductByName(nombre, initial?.id)
      if (existing) {
        setError(
          '⚠️ Ya existe un producto con este nombre. Verifica si se trata del mismo ítem.',
        )
        return
      }

      const stockMinimoInput = Number(values.stock_minimo)
      const stockMinimo =
        values.stock_minimo.trim() === '' || stockMinimoInput === 0
          ? STOCK_MINIMO_DEFAULT
          : stockMinimoInput

      const product: ProductosInsert = {
        nombre,
        categoria,
        codigo_barras: values.codigo_barras.trim() || null,
        precio_venta: precioVenta,
        costo: isFromPurchase ? 0 : Number(values.costo),
        stock_actual: isFromPurchase || !showStockField ? 0 : Number(values.stock_actual),
        stock_minimo: stockMinimo,
      }
      await onSubmit(product)
    } catch (cause) {
      setError(
        isDuplicateBarcodeError(cause)
          ? ERROR_BARCODE_DUPLICADO
          : cause instanceof Error
            ? cause.message
            : 'Ocurrió un error al guardar',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400'
  const labelClass = 'mb-1 block text-sm font-semibold text-slate-600'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nuevo-producto-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-full w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="nuevo-producto-title" className="text-2xl font-bold text-slate-900">
            {initial
              ? 'Editar producto'
              : isFromPurchase
                ? 'Nuevo producto (para compra)'
                : 'Nuevo producto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {isFromPurchase && (
          <div className="mb-5 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            El <strong>stock inicial</strong> y el <strong>costo unitario</strong> de este
            producto se calcularán al registrar la compra en el Paso 3. Se creará con{' '}
            <strong>stock 0</strong>.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="nombre" className={labelClass}>
              Nombre
            </label>
            <input
              id="nombre"
              autoFocus
              value={values.nombre}
              onChange={(e) => setField('nombre', e.target.value)}
              onBlur={() => setField('nombre', toTitleCase(values.nombre))}
              className={inputClass}
              placeholder="Ej. Inca Kola Sin Azúcar 500ml"
            />
          </div>

          <div className="relative">
            <label htmlFor="categoria" className={labelClass}>
              Categoría
            </label>
            <input
              id="categoria"
              autoComplete="off"
              value={values.categoria}
              onChange={(e) => {
                setField('categoria', e.target.value)
                setCategoriaOpen(true)
              }}
              onFocus={() => setCategoriaOpen(true)}
              onBlur={() => setCategoriaOpen(false)}
              className={`${inputClass} pr-10`}
              placeholder="Elige una categoría o escribe una nueva…"
            />
            <button
              type="button"
              aria-label="Mostrar categorías existentes"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setCategoriaOpen((open) => !open)}
              className="absolute right-2 top-8 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <ChevronDown
                size={18}
                strokeWidth={2.5}
                className={`transition-transform ${categoriaOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {categoriaOpen && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border-2 border-slate-200 bg-white py-1 shadow-lg">
                {filteredCategories.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-slate-400">
                    Sin coincidencias. El texto se guardará como nueva categoría.
                  </li>
                ) : (
                  filteredCategories.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault()
                          setField('categoria', name)
                          setCategoriaOpen(false)
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-sky-50"
                      >
                        <span>{toTitleCase(name)}</span>
                        {isExistingCategory &&
                          name.toLowerCase() === values.categoria.trim().toLowerCase() && (
                            <Check size={14} className="shrink-0 text-sky-600" aria-hidden="true" />
                          )}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}

            <p className="mt-2 text-xs font-semibold text-slate-400">
              {isExistingCategory
                ? `Categoría existente: ${toTitleCase(values.categoria.trim())}`
                : `Se creará la nueva categoría: ${toTitleCase(values.categoria.trim()) || '…'}`}
            </p>
          </div>

          <div>
            <label htmlFor="codigo_barras" className={labelClass}>
              Código de barras
            </label>
            <input
              id="codigo_barras"
              value={values.codigo_barras}
              onChange={(e) => setField('codigo_barras', e.target.value)}
              className={inputClass}
              placeholder="Opcional"
            />
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Si lo dejas en blanco, el producto se guardará sin código de barras.
            </p>
          </div>

          <div>
            <label htmlFor="precio_venta" className={labelClass}>
              Precio de venta
            </label>
            <input
              id="precio_venta"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={values.precio_venta}
              onChange={(e) => setField('precio_venta', e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
            {margin !== null && (
              <p
                className={`mt-2 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ${marginClass}`}
              >
                <TrendingUp size={16} strokeWidth={2.5} aria-hidden="true" />
                Margen de ganancia: {Math.round(margin)}%
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="costo" className={labelClass}>
                Costo Unitario
              </label>
              <button
                type="button"
                onClick={() => setPaqueteOpen((open) => !open)}
                aria-expanded={paqueteOpen}
                aria-controls="calculadora-paquete"
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
                  paqueteOpen
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Calculator size={14} strokeWidth={2.5} aria-hidden="true" />
                Calcular por paquete/caja
              </button>
            </div>
            <input
              id="costo"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={values.costo}
              onChange={(e) => setField('costo', e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
            <p className="mt-2 text-xs font-semibold text-slate-400">
              Ingresa el costo por <strong>UNIDAD individual</strong>.
            </p>

            {paqueteOpen && (
              <div
                id="calculadora-paquete"
                className="mt-4 space-y-3 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4"
              >
                <div>
                  <label htmlFor="paquete-precio" className="mb-1 block text-xs font-semibold text-slate-600">
                    Precio del paquete/caja (S/)
                  </label>
                  <input
                    id="paquete-precio"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={paquetePrecio}
                    onChange={(e) => {
                      setPaquetePrecio(e.target.value)
                      applyCalculatedCost(e.target.value, paqueteUnidades)
                    }}
                    className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="paquete-unidades" className="mb-1 block text-xs font-semibold text-slate-600">
                    Unidades por paquete
                  </label>
                  <input
                    id="paquete-unidades"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={paqueteUnidades}
                    onChange={(e) => {
                      setPaqueteUnidades(e.target.value)
                      applyCalculatedCost(paquetePrecio, e.target.value)
                    }}
                    className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400"
                    placeholder="Ej. 24"
                  />
                </div>
                {costoCalc !== null && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-100 px-3 py-2">
                    <p className="text-sm font-bold text-emerald-700">
                      ≈ {formatMoney(costoCalc)} por unidad
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setField('costo', costoCalc.toFixed(2))
                        setPaqueteOpen(false)
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white transition-colors hover:bg-emerald-700 active:scale-[0.98]"
                    >
                      [ Insertar costo ]
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="stock_minimo" className={labelClass}>
              Stock mínimo
            </label>
            <input
              id="stock_minimo"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.stock_minimo}
              onChange={(e) => setField('stock_minimo', e.target.value)}
              className={inputClass}
              placeholder="En blanco = 5"
            />
            {(values.stock_minimo.trim() === '' || Number(values.stock_minimo) === 0) && (
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Se usará <strong>5</strong> por defecto.
              </p>
            )}
          </div>

          {showStockField && (
            <div>
              <label htmlFor="stock_actual" className={labelClass}>
                Stock actual
              </label>
              <input
                id="stock_actual"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={values.stock_actual}
                onChange={(e) => setField('stock_actual', e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-rose-100 px-4 py-2 font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-2xl border-2 border-slate-200 px-6 text-base font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-2xl bg-sky-500 px-8 text-base font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {submitting ? 'Guardando…' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}