import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Minus, PackageSearch, TrendingUp, X } from 'lucide-react'
import { fetchProductByName, fetchProductCategories } from '../../services/products'
import type { ProductosInsert, ProductosRow } from '../../types/database.types'
import { formatMoney, toTitleCase } from '../../utils/format'
import { CategoryChips } from './CategoryChips'

interface ProductFormModalProps {
  onClose: () => void
  onSubmit: (product: ProductosInsert) => Promise<void>
  initial?: ProductosRow | null
  initialPrefill?: {
    nombre: string
    categoria: string
    codigo_barras?: string
    precio_venta?: string
    costo?: string
    stock_minimo?: string
  } | null
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
const CATEGORIAS = [
  'Abarrotes',
  'Bebidas',
  'Helados',
  'Útiles',
  'Copias e Impresiones',
  'Accesorios Autos',
  'General',
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

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Palabras clave por categoría: se usan para ordenar las tarjetas de categorías
 * según el nombre del producto. Si no hay coincidencias, el orden queda igual.
 */
const KEYWORDS_POR_CATEGORIA: Record<string, string[]> = {
  Bebidas: [
    'gaseosa',
    'agua',
    'coca',
    'inca',
    'pepsi',
    'jugo',
    'limonada',
    'energetica',
    'chicha',
    'cerveza',
    'cafe',
    'te',
    'bebida',
  ],
  Snacks: [
    'canchita',
    'papas',
    'doritos',
    'cheezz',
    'chizito',
    'snack',
    'galleta',
    'chifle',
    'mani',
    'cacahuate',
  ],
  'Lácteos': [
    'leche',
    'yogur',
    'yogurt',
    'queso',
    'mantequilla',
    'margarina',
    'pan',
    'huevo',
  ],
  Limpieza: [
    'lejia',
    'detergente',
    'suavizante',
    'limpia',
    'esponja',
    'blanqueador',
    'jabon',
  ],
  Abarrotes: [
    'arroz',
    'fideo',
    'aceite',
    'azucar',
    'atun',
    'lenteja',
    'frejol',
    'garbanzo',
    'menestra',
    'conserva',
    'salsa',
    'vinagre',
    'sal',
  ],
  Golosinas: ['chocolate', 'caramelo', 'chupete', 'goma', 'menta', 'turron'],
}

function scoreCategory(nombre: string, categoria: string): number {
  const nombreNorm = normalize(nombre)
  const categoriaNorm = normalize(categoria)
  if (!nombreNorm || nombreNorm.length < 2 || categoriaNorm === 'general') {
    return 0
  }
  let score = 0
  if (nombreNorm.includes(categoriaNorm)) {
    score += 5
  }
  for (const keyword of KEYWORDS_POR_CATEGORIA[categoria] ?? []) {
    if (keyword.length >= 3 && nombreNorm.includes(keyword)) {
      score += 2
    }
  }
  return score
}

interface CategoriaSugerida {
  nombre: string
  score: number
}

const moneyInputClass =
  'h-14 w-full rounded-2xl border border-line bg-surface pl-10 pr-4 text-xl font-bold text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-muted/70 focus:border-line-strong focus:bg-surface-2'

const plainInputClass =
  'h-14 w-full rounded-2xl border border-line bg-surface px-4 text-lg font-semibold text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-muted/70 focus:border-line-strong focus:bg-surface-2'

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-muted">
      {children}
    </p>
  )
}

export function ProductFormModal({
  onClose,
  onSubmit,
  initial,
  initialPrefill = null,
}: ProductFormModalProps) {
  const [values, setValues] = useState<FormValues>(() => {
    if (initial) {
      return {
        nombre: initial.nombre,
        categoria: initial.categoria,
        codigo_barras: initial.codigo_barras ?? '',
        precio_venta: String(initial.precio_venta),
        costo: String(initial.costo),
        stock_actual: String(initial.stock_actual),
        stock_minimo: String(initial.stock_minimo),
      }
    }
    return {
      ...EMPTY_VALUES,
      stock_actual: '0',
      ...(initialPrefill
        ? {
            nombre: initialPrefill.nombre,
            categoria: initialPrefill.categoria,
            codigo_barras: initialPrefill.codigo_barras ?? '',
            precio_venta: initialPrefill.precio_venta ?? '',
            costo: initialPrefill.costo ?? '',
            stock_minimo: initialPrefill.stock_minimo ?? '',
          }
        : {}),
    }
  })
  const [categories, setCategories] = useState<string[]>([])
  const [paqueteOpen, setPaqueteOpen] = useState(false)
  const [opcionesOpen, setOpcionesOpen] = useState(false)
  const [paquetePrecio, setPaquetePrecio] = useState('')
  const [paqueteUnidades, setPaqueteUnidades] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const loadCategories = async (): Promise<void> => {
      try {
        const list = await fetchProductCategories()
        if (active) setCategories(list.length > 0 ? list : CATEGORIAS)
      } catch {
        if (active) setCategories(CATEGORIAS)
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
    return Array.from(unique)
  }, [categories, initial])

  const chippedCategories = useMemo(() => {
    const sugeridas = new Set(CATEGORIAS.map((name) => name.toLowerCase()))
    const resultado: { nombre: string }[] = CATEGORIAS.map((nombre) => ({
      nombre,
    }))
    for (const nombre of allCategories) {
      if (!sugeridas.has(nombre.toLowerCase())) {
        resultado.push({ nombre })
      }
    }
    return resultado
  }, [allCategories])

  const categoriasOrdenadas = useMemo((): {
    categorias: CategoriaSugerida[]
    sugerida: string | null
  } => {
    const scored = chippedCategories.map((categoria) => ({
      nombre: categoria.nombre,
      score: scoreCategory(values.nombre, categoria.nombre),
    }))
    scored.sort((a, b) => b.score - a.score)
    const sugerida = scored.length > 0 && scored[0].score > 0 ? scored[0].nombre : null
    return { categorias: scored, sugerida }
  }, [chippedCategories, values.nombre])

  const isCustomCategory =
    values.categoria.trim() !== '' &&
    !chippedCategories.some(
      (categoria) =>
        categoria.nombre.toLowerCase() === values.categoria.trim().toLowerCase(),
    )

  const setField = (field: keyof FormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const precioNum = values.precio_venta === '' ? Number.NaN : Number(values.precio_venta)
  const costNum = values.costo === '' ? Number.NaN : Number(values.costo)
  const gananciaInfo =
    Number.isFinite(precioNum) &&
    precioNum > 0 &&
    Number.isFinite(costNum) &&
    costNum > 0
      ? {
          ganancia: precioNum - costNum,
          margen: ((precioNum - costNum) / precioNum) * 100,
        }
      : null

  const paquetePrecioNum = paquetePrecio === '' ? Number.NaN : Number(paquetePrecio)
  const paqueteUnidadesNum =
    paqueteUnidades === '' ? Number.NaN : Number(paqueteUnidades)
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

  const showStockField = Boolean(initial)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)

    if (!values.nombre.trim()) {
      setError('Escribe el nombre del producto (ej. “Inca Kola 500ml”).')
      return
    }

    const categoria = toTitleCase(values.categoria.trim())
    if (!categoria) {
      setError('Elige una categoría tocando una tarjeta o escribe una nueva.')
      return
    }

    const precioVenta = Number(values.precio_venta)
    if (
      values.precio_venta.trim() === '' ||
      !Number.isFinite(precioVenta) ||
      precioVenta < 0
    ) {
      setError('Escribe a cuánto lo vendes (ej. 2.50).')
      return
    }

    const costo = Number(values.costo)
    if (values.costo.trim() === '' || !Number.isFinite(costo) || costo < 0) {
      setError('Escribe cuánto te cuesta cada uno (o usa “Compras por caja”).')
      return
    }

    if (showStockField) {
      const stockActual = Number(values.stock_actual)
      if (
        values.stock_actual.trim() === '' ||
        !Number.isFinite(stockActual) ||
        stockActual < 0
      ) {
        setError('Escribe cuántas unidades hay ahorita (ej. 30).')
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
        costo,
        stock_actual: showStockField ? Number(values.stock_actual) : 0,
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nuevo-producto-title"
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#0b0420]/85 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="fade-up max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
              Inventario
            </p>
            <h2 id="nuevo-producto-title" className="text-2xl font-black tracking-tighter text-ink">
              {initial ? 'Editar producto' : 'Nuevo producto'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-muted transition-all duration-200 hover:bg-surface-3 hover:text-ink"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Paso 1: ¿Qué es? */}
        <div className="mb-6">
          <SectionTitle>¿Qué es?</SectionTitle>
          <input
            id="nombre"
            autoFocus
            value={values.nombre}
            onChange={(e) => setField('nombre', e.target.value)}
            onBlur={() => setField('nombre', toTitleCase(values.nombre))}
            className={plainInputClass}
            placeholder="Ej. Inca Kola sin azúcar 500ml"
          />
        </div>

        {/* Paso 2: Categoría */}
        <div className="mb-6">
          <SectionTitle>Categoría</SectionTitle>
          <CategoryChips
            sugerencias={categoriasOrdenadas.categorias}
            sugerida={categoriasOrdenadas.sugerida}
            selected={values.categoria}
            onSelect={(nombre) => setField('categoria', nombre)}
          />
          <input
            id="categoria"
            autoComplete="off"
            value={values.categoria}
            onChange={(e) => setField('categoria', e.target.value)}
            className={`${plainInputClass} mt-2`}
            placeholder={
              isCustomCategory
                ? 'Escribe una categoría nueva y se creará al guardar'
                : 'Si no encuentra la tuya, escríbela aquí'
            }
          />
          {isCustomCategory && (
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-profit">
              <Check size={14} strokeWidth={3} aria-hidden="true" />
              Se creará la nueva categoría “{toTitleCase(values.categoria)}”
            </p>
          )}
        </div>

        {/* Paso 3: Precios y ganancia */}
        <div className="mb-6">
          <SectionTitle>Precios (cuánto ganas)</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="precio_venta" className="mb-1 block text-sm font-bold text-muted">
                ¿En cuánto lo vendes?
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">
                  S/
                </span>
                <input
                  id="precio_venta"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={values.precio_venta}
                  onChange={(e) => setField('precio_venta', e.target.value)}
                  className={moneyInputClass}
                  placeholder="2.50"
                />
              </div>
              <p className="mt-1 text-xs font-semibold text-muted">
                Lo que pagará el cliente.
              </p>
            </div>

            <div>
              <label htmlFor="costo" className="mb-1 block text-sm font-bold text-muted">
                ¿Cuánto te cuesta cada uno?
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">
                  S/
                </span>
                <input
                  id="costo"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={values.costo}
                  onChange={(e) => setField('costo', e.target.value)}
                  className={moneyInputClass}
                  placeholder="1.20"
                />
              </div>
              <p className="mt-1 text-xs font-semibold text-muted">
                Lo que pagas al comprarlo.
              </p>
            </div>
          </div>

          {gananciaInfo !== null && (
            <div
              className={`mt-3 flex flex-wrap items-center gap-2 rounded-2xl border px-4 py-3 backdrop-blur-xl ${
                gananciaInfo.ganancia >= 0
                  ? 'border-emerald-200/30 bg-emerald-400/15'
                  : 'border-rose-200/30 bg-rose-400/15'
              }`}
            >
              <TrendingUp
                size={20}
                strokeWidth={2.5}
                aria-hidden="true"
                className={gananciaInfo.ganancia >= 0 ? 'text-profit' : 'text-loss'}
              />
              <p
                className={`text-lg font-black tracking-tight ${
                  gananciaInfo.ganancia >= 0 ? 'text-profit' : 'text-loss'
                }`}
              >
                {gananciaInfo.ganancia >= 0 ? 'Ganas' : 'Estás vendiendo perdiendo'}{' '}
                {formatMoney(Math.abs(gananciaInfo.ganancia))} por unidad (
                {Math.round(gananciaInfo.margen)}%)
              </p>
              {gananciaInfo.ganancia < 0 && (
                <span className="rounded-lg border border-rose-200/40 bg-rose-500/40 px-2 py-0.5 text-xs font-black text-ink">
                  Revísalo
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setPaqueteOpen((open) => !open)}
            aria-expanded={paqueteOpen}
            aria-controls="calculadora-paquete"
            className={`mt-3 inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold backdrop-blur-xl transition-all duration-300 active:scale-[0.98] ${
              paqueteOpen
                ? 'border-sky-400/40 bg-sky-400/15 text-sky-200'
                : 'border-line bg-surface text-ink hover:bg-surface-3 hover:text-ink'
            }`}
          >
            <PackageSearch size={18} strokeWidth={2.5} aria-hidden="true" />
            ¿Compras por caja / paquete? Sácame el costo
          </button>

          {paqueteOpen && (
            <div
              id="calculadora-paquete"
              className="mt-3 space-y-3 rounded-2xl border border-line bg-surface p-4 backdrop-blur-xl"
            >
              <div>
                <label htmlFor="paquete-precio" className="mb-1 block text-xs font-bold text-muted">
                  La caja / paquete costó (S/)
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
                  className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-lg font-bold text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-muted/70 focus:border-line-strong"
                  placeholder="Ej. 24.00"
                />
              </div>
              <div>
                <label htmlFor="paquete-unidades" className="mb-1 block text-xs font-bold text-muted">
                  ¿Cuántas unidades trae?
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
                  className="h-12 w-full rounded-xl border border-line bg-surface px-3 text-lg font-bold text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-muted/70 focus:border-line-strong"
                  placeholder="Ej. 24"
                />
              </div>
              {costoCalc !== null && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/30 bg-emerald-400/15 px-3 py-2">
                  <p className="text-sm font-black text-profit">
                    Cada unidad te cuesta ≈ {formatMoney(costoCalc)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setField('costo', costoCalc.toFixed(2))
                      setPaqueteOpen(false)
                    }}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-white transition-all hover:bg-emerald-400 active:scale-[0.98]"
                  >
                    Usar este costo [ S/ {formatMoney(costoCalc)} ]
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Paso 4: Alerta de stock */}
        <div className="mb-6">
          <SectionTitle>¿Cuándo avisarte?</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="stock_minimo" className="mb-1 block text-sm font-bold text-muted">
                ¿Cuántos deben quedar para avisarte?
              </label>
              <input
                id="stock_minimo"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={values.stock_minimo}
                onChange={(e) => setField('stock_minimo', e.target.value)}
                className={plainInputClass}
                placeholder="Ej. 5"
              />
              <p className="mt-1 text-xs font-semibold text-muted">
                Cuando queden menos que eso, la app te avisará. En blanco = 5.
              </p>
            </div>

            {showStockField && (
              <div>
                <label htmlFor="stock_actual" className="mb-1 block text-sm font-bold text-muted">
                  ¿Cuántas unidades hay ahorita?
                </label>
                <input
                  id="stock_actual"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={values.stock_actual}
                  onChange={(e) => setField('stock_actual', e.target.value)}
                  className={plainInputClass}
                  placeholder="Ej. 30"
                />
              </div>
            )}
          </div>
        </div>

        {/* Opciones (avanzado): código de barras */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setOpcionesOpen((open) => !open)}
            aria-expanded={opcionesOpen}
            className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3"
          >
            Opciones {opcionesOpen ? '' : '(opcional)'}
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-ink transition-transform duration-300 ${
                opcionesOpen ? 'rotate-180' : ''
              }`}
            >
              <Minus size={14} strokeWidth={3} aria-hidden="true" />
            </span>
          </button>
          {opcionesOpen && (
            <div className="mt-3">
              <label htmlFor="codigo_barras" className="mb-1 block text-sm font-bold text-muted">
                Código de barras
              </label>
              <input
                id="codigo_barras"
                value={values.codigo_barras}
                onChange={(e) => setField('codigo_barras', e.target.value)}
                className={plainInputClass}
                placeholder="Ej. 7501234567890"
              />
              <p className="mt-1 text-xs font-semibold text-muted">
                Solo si el producto tiene código. En blanco = se guarda sin código.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-2xl border border-rose-200/30 bg-rose-400/20 px-4 py-2.5 font-bold text-loss"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-line bg-surface px-6 py-3 text-base font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-2xl border border-emerald-200/30 bg-emerald-500 px-8 py-3 text-base font-black text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Check size={18} strokeWidth={3} aria-hidden="true" />
            {submitting
              ? 'Guardando…'
              : initial
                ? 'Guardar cambios'
                : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}