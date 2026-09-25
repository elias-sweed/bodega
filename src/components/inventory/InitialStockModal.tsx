import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { PackagePlus, Plus, Trash2, X } from 'lucide-react'
import { fetchProductCategories } from '../../services/products'
import type { CargarInventarioInicialItem } from '../../types/database.types'
import { getFriendlyError } from '../../utils/errors'
import { toTitleCase } from '../../utils/format'
import { CategoryField } from './CategoryField'

interface InitialStockModalProps {
  onClose: () => void
  onSubmit: (items: CargarInventarioInicialItem[]) => Promise<void>
}

interface NewLine {
  key: string
  nombre: string
  categoria: string
  precio_venta: string
  cantidad: string
  stock_minimo: string
}

type NewTextField = Exclude<keyof NewLine, 'key'>

const CATEGORIAS = [
  'Abarrotes',
  'Bebidas',
  'Helados',
  'Lácteos',
  'Snacks',
  'Limpieza',
  'Útiles',
  'General',
]
const STOCK_MINIMO_DEFAULT = 5

const inputClass =
  'h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-base font-semibold text-ink outline-none placeholder:text-muted/70 focus:border-amber-300/70 focus:bg-surface-3 focus:ring-4 focus:ring-amber-400/10'
const labelClass =
  'mb-1.5 block text-xs font-extrabold uppercase tracking-[0.16em] text-muted'

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseEntero(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function parseNumero(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function nuevaLinea(key: string): NewLine {
  return {
    key,
    nombre: '',
    categoria: '',
    precio_venta: '',
    cantidad: '',
    stock_minimo: '',
  }
}

export function InitialStockModal({ onClose, onSubmit }: InitialStockModalProps) {
  const [newLines, setNewLines] = useState<NewLine[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [latestKey, setLatestKey] = useState<string | null>(null)
  const keyCounter = useRef(0)
  const latestRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (latestKey && latestRef.current) {
      latestRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
    }
  }, [latestKey])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const nextKey = (): string => {
    keyCounter.current += 1
    return `nuevo-${keyCounter.current}`
  }

const [categories, setCategories] = useState<string[]>(CATEGORIAS)

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

  const totalUnits = useMemo(
    () =>
      newLines.reduce((total, line) => {
        const parsed = parseEntero(line.cantidad)
        return total + (parsed ?? 0)
      }, 0),
    [newLines],
  )

  const addNewProduct = (): void => {
    const key = nextKey()
    setLatestKey(key)
    setNewLines((current) => [nuevaLinea(key), ...current])
  }

  const updateNew = (key: string, field: NewTextField, value: string): void => {
    setNewLines((current) =>
      current.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    )
  }

  const removeNew = (key: string): void => {
    setNewLines((current) => current.filter((line) => line.key !== key))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)

    if (newLines.length === 0) {
      setError('Agrega al menos un producto para cargar el inventario.')
      return
    }

    const items: CargarInventarioInicialItem[] = []
    const names = new Set<string>()

    for (const line of newLines) {
      const nombre = toTitleCase(line.nombre)
      const categoria = toTitleCase(line.categoria)
      const precioVenta = parseNumero(line.precio_venta)
      const cantidad = parseEntero(line.cantidad)
      const stockMinimo =
        line.stock_minimo.trim() === '' ? STOCK_MINIMO_DEFAULT : parseEntero(line.stock_minimo)

      if (!nombre) {
        setError('Escribe el nombre de cada producto nuevo.')
        return
      }
      if (!categoria) {
        setError(`Elige una categoría para "${nombre}".`)
        return
      }
      if (precioVenta === null) {
        setError(`Escribe el precio de venta de "${nombre}".`)
        return
      }
      if (cantidad === null) {
        setError(`Escribe cuántas unidades tienes de "${nombre}".`)
        return
      }
      if (stockMinimo === null) {
        setError(`El stock mínimo de "${nombre}" debe ser un número entero igual o mayor a 0.`)
        return
      }
      if (names.has(normalize(nombre))) {
        setError(`"${nombre}" ya está agregado en esta carga.`)
        return
      }

      names.add(normalize(nombre))
      items.push({
        tipo: 'nuevo',
        nombre,
        categoria,
        codigo_barras: null,
        precio_venta: precioVenta,
        stock_minimo: stockMinimo,
        cantidad,
      })
    }

    setSubmitting(true)
    try {
      await onSubmit(items)
    } catch (cause) {
      setError(getFriendlyError(cause, 'No se pudo cargar el inventario inicial. Inténtalo de nuevo.'))
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="app-shell inventario-route">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cargar-inventario-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#080315]/90 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
      <form
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/15 bg-surface p-6 shadow-[0_30px_90px_-28px_rgba(0,0,0,0.95)]"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/15 text-amber-300">
              <PackagePlus size={21} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-300">
                Inventario
              </p>
              <h2 id="cargar-inventario-title" className="text-2xl font-black tracking-tighter text-ink">
                Cargar inventario inicial
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-2 text-muted transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-sm font-medium leading-relaxed text-ink">
          Registra la mercadería que ya tienes en la bodega. Esto se guardará como{' '}
          <strong className="font-extrabold">Stock inicial</strong>, no como una compra ni como un gasto.
        </div>

        <section className="mb-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
                Productos nuevos
              </p>
              <p className="mt-1 text-sm font-medium text-muted">
                Créalos aquí junto con la cantidad que ya tienes. El costo queda pendiente hasta que registres una compra; por eso aún no se mostrará el margen.
              </p>
            </div>
            <button
              type="button"
              onClick={addNewProduct}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-amber-300/35 bg-amber-400/10 px-4 text-sm font-extrabold text-ink transition-colors hover:bg-amber-400/20"
            >
              <Plus size={16} strokeWidth={3} aria-hidden="true" />
              Agregar producto nuevo
            </button>
          </div>

          {newLines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface-sub px-5 py-5 text-center text-sm font-medium text-muted">
              Agrega los productos nuevos que no están en el catálogo junto con su stock inicial.
            </div>
          ) : (
            <div className="space-y-3">
              {newLines.map((line, index) => (
                <div
                  key={line.key}
                  ref={line.key === latestKey ? latestRef : undefined}
                  className={`rounded-2xl border p-4 ${
                    line.key === latestKey
                      ? 'fade-up row-flash border-amber-300/40 bg-amber-400/10'
                      : 'border-line bg-surface-2'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-ink">Producto nuevo {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeNew(line.key)}
                      aria-label={`Quitar producto nuevo ${index + 1}`}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-400/35 bg-rose-400/10 text-loss transition-colors hover:bg-rose-400/20"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor={`nombre-${line.key}`} className={labelClass}>
                        Nombre del producto
                      </label>
                      <input
                        id={`nombre-${line.key}`}
                        autoFocus={line.key === latestKey}
                        value={line.nombre}
                        onChange={(event) => updateNew(line.key, 'nombre', event.target.value)}
                        className={inputClass}
                        placeholder="Ej. Gaseosa"
                      />
                    </div>
                    <div>
                      <label htmlFor={`categoria-${line.key}`} className={labelClass}>
                        Categoría
                      </label>
                      <CategoryField
                        id={`categoria-${line.key}`}
                        value={line.categoria}
                        onChange={(value) => updateNew(line.key, 'categoria', value)}
                        categories={categories}
                        inputClassName={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`cantidad-nuevo-${line.key}`} className={labelClass}>
                        Unidades que tienes
                      </label>
                      <input
                        id={`cantidad-nuevo-${line.key}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={line.cantidad}
                        onChange={(event) => updateNew(line.key, 'cantidad', event.target.value)}
                        aria-label={`Unidades que tienes de ${line.nombre || 'producto nuevo'}`}
                        className={`${inputClass} tabular-nums`}
                        placeholder="Ej. 3"
                      />
                    </div>
                    <div>
                      <label htmlFor={`precio-${line.key}`} className={labelClass}>
                        Precio de venta (S/)
                      </label>
                      <input
                        id={`precio-${line.key}`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={line.precio_venta}
                        onChange={(event) => updateNew(line.key, 'precio_venta', event.target.value)}
                        className={`${inputClass} tabular-nums`}
                        placeholder="Ej. 2.50"
                      />
                    </div>
                    <div>
                      <label htmlFor={`stock-minimo-${line.key}`} className={labelClass}>
                        Avisar cuando queden (opcional)
                      </label>
                      <input
                        id={`stock-minimo-${line.key}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={line.stock_minimo}
                        onChange={(event) => updateNew(line.key, 'stock_minimo', event.target.value)}
                        className={`${inputClass} tabular-nums`}
                        placeholder={`Por defecto: ${STOCK_MINIMO_DEFAULT}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-2xl border border-rose-200/30 bg-rose-400/20 px-4 py-3 text-sm font-bold text-loss"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="text-sm font-semibold text-muted">
            {newLines.length} {newLines.length === 1 ? 'producto' : 'productos'} ·{' '}
            <span className="font-black tabular-nums text-ink">{totalUnits} unidades</span>
          </p>
          <div className="flex w-full gap-2.5 sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-2xl border border-line bg-surface-2 px-6 text-sm font-extrabold text-ink transition-colors hover:bg-surface-3 active:scale-[0.98] sm:flex-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || newLines.length === 0}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 px-6 text-sm font-black text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
            >
              <PackagePlus size={17} strokeWidth={2.5} aria-hidden="true" />
              {submitting ? 'Guardando…' : 'Guardar inventario inicial'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>,
    document.body,
  )
}