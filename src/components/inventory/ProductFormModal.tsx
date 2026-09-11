import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Calculator, TrendingUp } from 'lucide-react'
import { fetchProductByName, fetchProductCategories } from '../../services/products'
import type { ProductosInsert, ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'

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

const CATEGORIA_NUEVA = '__nueva__'
const STOCK_MINIMO_DEFAULT = 5

const ERROR_BARCODE_DUPLICADO =
  '⚠️ Este código de barras ya está registrado en otro producto. Por favor, usa uno diferente o déjalo en blanco.'

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

function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      /^\d+[a-z]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

export function ProductFormModal({
  onClose,
  onSubmit,
  initial,
  isFromPurchase = false,
}: ProductFormModalProps) {
  const [values, setValues] = useState<FormValues>(() => {
    if (isFromPurchase) {
      return { ...EMPTY_VALUES, stock_actual: '0' }
    }
    return initial
      ? {
          nombre: initial.nombre,
          categoria: initial.categoria,
          codigo_barras: initial.codigo_barras ?? '',
          precio_venta: String(initial.precio_venta),
          costo: String(initial.costo),
          stock_actual: String(initial.stock_actual),
          stock_minimo: String(initial.stock_minimo),
        }
      : EMPTY_VALUES
  })
  const [categories, setCategories] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
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
        if (active) setCategories(list)
      } catch {
        if (active) setCategories([])
      } finally {
        if (active) setCategoriesLoading(false)
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

  const setField = (field: keyof FormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const handleCategoriaChange = (value: string): void => {
    if (value === CATEGORIA_NUEVA) {
      setShowNewCategory(true)
      setField('categoria', '')
      return
    }
    setShowNewCategory(false)
    setField('categoria', value)
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)

    if (!values.nombre.trim()) {
      setError('⚠️ Ingresa el nombre del producto para continuar.')
      return
    }

    const categoria = showNewCategory ? newCategory.trim() : values.categoria.trim()
    if (!categoria) {
      setError(
        showNewCategory
          ? 'Por favor, escribe el nombre de la nueva categoría.'
          : 'Por favor, selecciona una categoría.',
      )
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

      const product: ProductosInsert = {
        nombre,
        categoria,
        codigo_barras: values.codigo_barras.trim() || null,
        precio_venta: precioVenta,
        costo: isFromPurchase ? 0 : Number(values.costo),
        stock_actual: isFromPurchase ? 0 : Number(values.stock_actual),
        stock_minimo:
          values.stock_minimo.trim() === ''
            ? STOCK_MINIMO_DEFAULT
            : Number(values.stock_minimo),
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
  const selectClass =
    'h-12 w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 outline-none transition-colors focus:border-sky-400'
  const labelClass = 'mb-1 block text-sm font-semibold text-slate-600'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nuevo-producto-title"
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4"
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
            className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-bold text-slate-500 transition-colors hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        {isFromPurchase && (
          <div className="mb-5 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            El <strong>stock inicial</strong> y el <strong>costo unitario</strong> de este
            producto se calcularán al registrar la compra en el Paso 3. Se creará con{' '}
            <strong>stock 0</strong>.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
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

          <div>
            <label htmlFor="categoria" className={labelClass}>
              Categoría
            </label>
            <select
              id="categoria"
              value={showNewCategory ? CATEGORIA_NUEVA : values.categoria}
              onChange={(e) => handleCategoriaChange(e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                {categoriesLoading ? 'Cargando categorías…' : 'Selecciona una categoría…'}
              </option>
              {allCategories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={CATEGORIA_NUEVA}>+ Nueva categoría…</option>
            </select>
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
          </div>

          {showNewCategory && (
            <div className="sm:col-span-2">
              <label htmlFor="nueva-categoria" className={labelClass}>
                Nombre de la nueva categoría
              </label>
              <input
                id="nueva-categoria"
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={inputClass}
                placeholder="Ej. Fiambres"
              />
            </div>
          )}

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
            {!isFromPurchase && margin !== null && (
              <p
                className={`mt-2 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ${marginClass}`}
              >
                <TrendingUp size={16} strokeWidth={2.5} aria-hidden="true" />
                Margen de ganancia: {Math.round(margin)}%
              </p>
            )}
          </div>

          {!isFromPurchase && (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor="costo" className="mb-1 block text-sm font-semibold text-slate-600">
                  Costo
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
          )}

          {!isFromPurchase && (
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
            {values.stock_minimo.trim() === '' && (
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Se usará <strong>5</strong> por defecto.
              </p>
            )}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-rose-100 px-4 py-2 font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-14 flex-1 rounded-2xl bg-slate-100 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-14 flex-[2] rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}