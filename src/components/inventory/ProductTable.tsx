/* oxlint-disable react/set-state-in-effect -- La paginación se reinicia al cambiar filtros. */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  History,
  PackagePlus,
  Pencil,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'
import { formatMoney, toTitleCase } from '../../utils/format'
import { exportCsv } from '../../utils/exportCsv'
import { StockBadge } from './StockBadge'

interface ProductTableProps {
  products: ProductosRow[]
  isAdmin?: boolean
  onEdit?: (product: ProductosRow) => void
  onPurchase?: (product: ProductosRow) => void
  onAdjustStock?: (product: ProductosRow) => void
  onDelete?: (product: ProductosRow) => void
  onKardex?: (product: ProductosRow) => void
  /** Ids recién llegados (ej. desde Compras): van primero y parpadean */
  pinnedIds?: string[]
  /** Id recién creado en Inventario: salta a su fila y la marca unos segundos */
  flashId?: string | null
  /** Productos creados en esta sesión; alimenta el filtro "Recientes" */
  recientesIds?: string[]
}

const PAGE_SIZE = 20

/** Ventana (horas) para el filtro "Agregados recientemente" */
const RECENT_HOURS = 72
const RECENT_MS = RECENT_HOURS * 60 * 60 * 1000
const FILTER_STORAGE_KEY = 'inventario:filtros:v1'

/** ¿Es reciente según su fecha en la DB? null/ausente se considera "no reciente". */
function esRecientePorFecha(product: ProductosRow): boolean {
  if (product.created_at === null || product.created_at === '') return false
  const instante = +new Date(product.created_at)
  return Number.isFinite(instante) && instante >= Date.now() - RECENT_MS
}

/** Instante en ms de una fecha; sin fecha válida queda de último (-Infinity). */
function fechaMs(iso: string | null | undefined): number {
  if (!iso) return -Infinity
  const instante = +new Date(iso)
  return Number.isFinite(instante) ? instante : -Infinity
}

interface PersistedFilters {
  search?: string
  category?: string
  margen?: MargenFiltro
  stock?: StockFiltro
  costoMin?: string
  costoMax?: string
  minMin?: string
  minMax?: string
  showFilters?: boolean
  recientes?: boolean
}

type MargenFiltro = 'todos' | 'alto' | 'medio' | 'bajo'
type StockFiltro = 'todos' | 'bajo' | 'medio' | 'alto'

type SortKey =
  | 'nombre'
  | 'categoria'
  | 'precio_venta'
  | 'costo'
  | 'stock_actual'
  | 'stock_minimo'
  | 'margen'

interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}

function marginPercent(product: ProductosRow): number | null {
  // Un costo en cero significa que todavía no se conoce el costo real.
  if (product.precio_venta <= 0 || product.costo <= 0) return null
  return ((product.precio_venta - product.costo) / product.precio_venta) * 100
}

function marginClass(margin: number): string {
  if (margin < 0) return 'border-rose-400/40 bg-rose-400/15 text-loss'
  if (margin < 20) return 'border-gold/40 bg-gold/15 text-gold'
  return 'border-profit/40 bg-profit/15 text-profit'
}

function marginLevel(margin: number | null): MargenFiltro | null {
  if (margin === null) return null
  if (margin >= 20) return 'alto'
  if (margin >= 0) return 'medio'
  return 'bajo'
}

function stockLevel(stock: number, minimo: number): 'bajo' | 'medio' | 'alto' {
  if (stock <= minimo) return 'bajo'
  if (stock <= minimo * 2) return 'medio'
  return 'alto'
}

function stockLevelLabel(stock: number, minimo: number): string {
  const level = stockLevel(stock, minimo)
  if (level === 'bajo') return 'Bajo'
  if (level === 'medio') return 'Medio'
  return 'Alto'
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const keep = new Set(
    [1, 2, current - 1, current, current + 1, total - 1, total].filter(
      (p) => p >= 1 && p <= total,
    ),
  )
  const sorted = [...keep].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…')
    out.push(p)
  })
  return out
}

const thClass =
  'px-5 py-3 font-extrabold uppercase tracking-widest text-[11px] text-muted'

const filterInputClass =
  'h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm font-bold tabular-nums text-ink outline-none placeholder:text-muted/70 focus:border-amber-300/70 focus:bg-surface-3 focus:ring-4 focus:ring-amber-400/10'
const filterLabelClass =
  'mb-1 block text-[11px] font-extrabold uppercase tracking-widest text-muted'

export function ProductTable({
  products,
  isAdmin = false,
  onEdit,
  onPurchase,
  onAdjustStock,
  onDelete,
  onKardex,
  pinnedIds = [],
  flashId = null,
  recientesIds = [],
}: ProductTableProps) {
  const persistedRef = useRef<PersistedFilters | null>(null)
  if (persistedRef.current === null) {
    try {
      const raw = window.sessionStorage.getItem(FILTER_STORAGE_KEY)
      persistedRef.current = raw ? (JSON.parse(raw) as PersistedFilters) : {}
    } catch {
      persistedRef.current = {}
    }
  }
  const persisted = persistedRef.current

  const [search, setSearch] = useState(persisted.search ?? '')
  const [category, setCategory] = useState(persisted.category ?? 'todas')
  const [margen, setMargen] = useState<MargenFiltro>(persisted.margen ?? 'todos')
  const [stockFiltro, setStockFiltro] = useState<StockFiltro>(persisted.stock ?? 'todos')
  const [costoMin, setCostoMin] = useState(persisted.costoMin ?? '')
  const [costoMax, setCostoMax] = useState(persisted.costoMax ?? '')
  const [minMin, setMinMin] = useState(persisted.minMin ?? '')
  const [minMax, setMinMax] = useState(persisted.minMax ?? '')
  const [showFilters, setShowFilters] = useState(persisted.showFilters ?? false)
  const [recientes, setRecientes] = useState(persisted.recientes ?? false)
  const [page, setPage] = useState(1)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [sort, setSort] = useState<SortState | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const handledFlashRef = useRef<string | null>(null)

  const scrollToTop = (): void => {
    let el = topRef.current?.parentElement ?? null
    while (el) {
      const overflowY = window.getComputedStyle(el).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') {
        el.scrollTo({ top: 0, behavior: 'auto' })
        return
      }
      el = el.parentElement
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const toggleSort = (key: SortKey): void => {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      }
      return { key, dir: 'asc' }
    })
    setPage(1)
    setDirection('next')
  }

  const renderSortIcon = (key: SortKey) => {
    if (sort?.key !== key) {
      return <ArrowUpDown size={13} strokeWidth={2.5} aria-hidden="true" className="opacity-50" />
    }
    return sort.dir === 'asc' ? (
      <ArrowUp size={13} strokeWidth={2.5} aria-hidden="true" />
    ) : (
      <ArrowDown size={13} strokeWidth={2.5} aria-hidden="true" />
    )
  }

  const thSortableClass =
    'cursor-pointer select-none transition-colors duration-200 hover:text-ink'

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.categoria.trim())
            .filter((name) => name.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [products],
  )

  // La columna Código solo existe cuando algún producto tiene código de barras
  const showBarcodeColumn = useMemo(
    () => products.some((p) => (p.codigo_barras ?? '').trim() !== ''),
    [products],
  )

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    const cMin = costoMin === '' ? null : Number(costoMin)
    const cMax = costoMax === '' ? null : Number(costoMax)
    const mMin = minMin === '' ? null : Number(minMin)
    const mMax = minMax === '' ? null : Number(minMax)
    return products.filter((product) => {
      if (
        recientes &&
        !recientesIds.includes(product.id) &&
        !esRecientePorFecha(product)
      ) {
        return false
      }
      if (
        query !== '' &&
        !product.nombre.toLowerCase().includes(query) &&
        !(product.codigo_barras ?? '').toLowerCase().includes(query)
      ) {
        return false
      }
      if (category !== 'todas' && product.categoria !== category) return false
      if (margen !== 'todos' && marginLevel(marginPercent(product)) !== margen) {
        return false
      }
      if (
        stockFiltro !== 'todos' &&
        stockLevel(product.stock_actual, product.stock_minimo) !== stockFiltro
      ) {
        return false
      }
      if (cMin !== null && Number.isFinite(cMin) && product.costo < cMin) return false
      if (cMax !== null && Number.isFinite(cMax) && product.costo > cMax) return false
      if (mMin !== null && Number.isFinite(mMin) && product.stock_minimo < mMin) {
        return false
      }
      if (mMax !== null && Number.isFinite(mMax) && product.stock_minimo > mMax) {
        return false
      }
      return true
    })
  }, [products, search, category, margen, stockFiltro, costoMin, costoMax, minMin, minMax, recientes, recientesIds])

  const sortedProducts = useMemo(() => {
    const pinned = new Set(pinnedIds)
    const items = [...filteredProducts]
    items.sort((a, b) => {
      // Lo recién llegado de Compras siempre primerito
      const pa = pinned.has(a.id) ? 0 : 1
      const pb = pinned.has(b.id) ? 0 : 1
      if (pa !== pb) return pa - pb
      // En "Recientes" ordena por fecha de registro: el más nuevo primero
      if (recientes) return fechaMs(b.created_at) - fechaMs(a.created_at)
      if (!sort) return 0
      const factor = sort.dir === 'asc' ? 1 : -1
      switch (sort.key) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre, 'es') * factor
        case 'categoria':
          return a.categoria.localeCompare(b.categoria, 'es') * factor
        case 'precio_venta':
          return (a.precio_venta - b.precio_venta) * factor
        case 'costo':
          return (a.costo - b.costo) * factor
        case 'stock_actual':
          return (a.stock_actual - b.stock_actual) * factor
        case 'stock_minimo':
          return (a.stock_minimo - b.stock_minimo) * factor
        case 'margen': {
          const ma = marginPercent(a)
          const mb = marginPercent(b)
          if (ma === null && mb === null) return 0
          if (ma === null) return 1
          if (mb === null) return -1
          return (ma - mb) * factor
        }
      }
    })
    return items
  }, [filteredProducts, sort, pinnedIds, recientes])

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE))

  // Al cambiar cualquier filtro se vuelve a la primera página
  useEffect(() => {
    setPage(1)
    setDirection('next')
  }, [search, category, margen, stockFiltro, costoMin, costoMax, minMin, minMax, recientes])

  // Los filtros sobreviven a salir/volver a la sección Inventario
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          search,
          category,
          margen,
          stock: stockFiltro,
          costoMin,
          costoMax,
          minMin,
          minMax,
          showFilters,
          recientes,
        }),
      )
    } catch {
      // Sin almacenamiento disponible: se ignora
    }
  }, [search, category, margen, stockFiltro, costoMin, costoMax, minMin, minMax, showFilters, recientes])

  // Si la lista se achica (ej. eliminan), no quedarse en una página vacía
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const activeFilterCount =
    (margen !== 'todos' ? 1 : 0) +
    (stockFiltro !== 'todos' ? 1 : 0) +
    (costoMin !== '' ? 1 : 0) +
    (costoMax !== '' ? 1 : 0) +
    (minMin !== '' ? 1 : 0) +
    (minMax !== '' ? 1 : 0) +
    (recientes ? 1 : 0)

  const clearFilters = (): void => {
    setMargen('todos')
    setStockFiltro('todos')
    setCostoMin('')
    setCostoMax('')
    setMinMin('')
    setMinMax('')
    setRecientes(false)
  }

  // Limpia todo (incluye búsqueda y categoría) para que nada oculte un producto
  const resetAllFilters = (): void => {
    setSearch('')
    setCategory('todas')
    clearFilters()
  }

  // Producto recién creado: salta a su página y marca su fila unos segundos
  useEffect(() => {
    if (!flashId || flashId === handledFlashRef.current) return
    const idx = sortedProducts.findIndex((p) => p.id === flashId)
    if (idx === -1) {
      // Existe pero un filtro lo oculta: limpiamos para mostrarlo
      if (products.some((p) => p.id === flashId)) resetAllFilters()
      return
    }
    handledFlashRef.current = flashId
    const targetPage = Math.max(1, Math.floor(idx / PAGE_SIZE) + 1)
    if (targetPage !== page) setPage(targetPage)
    setHighlightId(flashId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashId, sortedProducts])

  useEffect(() => {
    if (!highlightId) return
    const timer = window.setTimeout(() => setHighlightId(null), 4000)
    return () => window.clearTimeout(timer)
  }, [highlightId])

  useEffect(() => {
    if (!highlightId) return
    const timer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`tr[data-product-id="${highlightId}"]`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, page])

  const goToPage = (next: number, dir: 'next' | 'prev'): void => {
    setDirection(dir)
    setPage(Math.min(Math.max(1, next), totalPages))
    scrollToTop()
  }

  const handleExport = (): void => {
    const now = new Date()
    const pad = (n: number): string => String(n).padStart(2, '0')
    const filename = `inventario-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`
    const header = [
      'N.º',
      'Producto',
      'Código',
      'Categoría',
      'Precio venta',
      'Costo',
      'Margen %',
      'Stock actual',
      'Stock mín',
      'Estado',
    ]
    const rows: (string | number)[][] = sortedProducts.map((product, i) => {
      const margin = marginPercent(product)
      return [
        i + 1,
        product.nombre,
        product.codigo_barras ?? '',
        product.categoria,
        Number(product.precio_venta.toFixed(2)),
        product.costo > 0 ? Number(product.costo.toFixed(2)) : 'Pendiente',
        margin === null ? '' : Number(margin.toFixed(2)),
        product.stock_actual,
        product.stock_minimo,
        stockLevelLabel(product.stock_actual, product.stock_minimo),
      ]
    })
    exportCsv([header, ...rows], filename)
  }

  const start = (page - 1) * PAGE_SIZE
  const pageItems = sortedProducts.slice(start, start + PAGE_SIZE)
  const end = start + pageItems.length

  return (
    <div ref={topRef} className="space-y-4 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block w-full max-w-xs">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-200/80"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o código…"
            className="h-11 w-full rounded-2xl border border-line bg-surface-sub pl-11 pr-4 text-sm font-semibold text-ink outline-none placeholder:text-muted focus:border-amber-300/70 focus:bg-surface-2 focus:ring-4 focus:ring-amber-400/10"
          />
        </label>

        <label className="relative block">
          <Tags
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-200/80"
            aria-hidden="true"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filtrar por categoría"
            className="h-11 cursor-pointer appearance-none rounded-2xl border border-line bg-surface-sub pl-9 pr-8 text-sm font-bold text-ink outline-none focus:border-amber-300/70 [&>option]:bg-[#241b66] [&>option]:text-slate-100"
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {toTitleCase(name)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => setRecientes((value) => !value)}
          aria-pressed={recientes}
          title="Mostrar solo los productos agregados recientemente"
          className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold backdrop-blur-2xl transition-all duration-300 active:scale-95 ${
            recientes
              ? 'border-sky-400/40 bg-sky-400/15 text-sky-200'
              : 'border-line bg-surface text-ink hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <Clock3 size={16} aria-hidden="true" />
          Recientes
        </button>

        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
          className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold backdrop-blur-2xl transition-all duration-300 active:scale-95 ${
            showFilters || activeFilterCount > 0
              ? 'border-line-strong bg-surface-3 text-ink'
              : 'border-line bg-surface text-ink hover:bg-surface-2 hover:text-ink'
          }`}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-black text-amber-950">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleExport}
          title="Exportar los productos filtrados para Excel"
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-extrabold text-ink backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0 active:scale-95"
        >
          <Download size={16} aria-hidden="true" />
          Exportar
        </button>

        <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold text-muted backdrop-blur-xl">
          {sortedProducts.length} de {products.length}
        </span>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            title="Quitar todos los filtros aplicados"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-rose-300/50 bg-rose-500/25 px-4 text-sm font-black tracking-tight text-ink shadow-sm backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200/70 hover:bg-rose-500/40 active:translate-y-0 active:scale-95"
          >
            <X size={17} strokeWidth={3} aria-hidden="true" />
            Limpiar ({activeFilterCount})
          </button>
        )}
      </div>

      {showFilters && (
        <div className="fade-in rounded-[22px] border border-line bg-surface p-4 backdrop-blur-2xl">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label htmlFor="filtro-margen" className={filterLabelClass}>
                Margen
              </label>
              <select
                id="filtro-margen"
                value={margen}
                onChange={(e) => setMargen(e.target.value as MargenFiltro)}
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink outline-none backdrop-blur-xl transition-all focus:border-line-strong [&>option]:bg-[#241b66] [&>option]:text-slate-100"
              >
                <option value="todos">Todos</option>
                <option value="alto">Alto (≥ 20%)</option>
                <option value="medio">Medio (0–20%)</option>
                <option value="bajo">Bajo (pérdida)</option>
              </select>
            </div>
            <div>
              <label htmlFor="filtro-stock" className={filterLabelClass}>
                Stock
              </label>
              <select
                id="filtro-stock"
                value={stockFiltro}
                onChange={(e) => setStockFiltro(e.target.value as StockFiltro)}
                className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink outline-none backdrop-blur-xl transition-all focus:border-line-strong [&>option]:bg-[#241b66] [&>option]:text-slate-100"
              >
                <option value="todos">Todos</option>
                <option value="bajo">Bajo (≤ mín)</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto (&gt; 2× mín)</option>
              </select>
            </div>
            <div>
              <span className={filterLabelClass}>Costo S/</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={costoMin}
                  onChange={(e) => setCostoMin(e.target.value)}
                  placeholder="Mín"
                  aria-label="Costo mínimo"
                  className={filterInputClass}
                />
                <span className="shrink-0 text-muted">–</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={costoMax}
                  onChange={(e) => setCostoMax(e.target.value)}
                  placeholder="Máx"
                  aria-label="Costo máximo"
                  className={filterInputClass}
                />
              </div>
            </div>
            <div>
              <span className={filterLabelClass}>Stock mín</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={minMin}
                  onChange={(e) => setMinMin(e.target.value)}
                  placeholder="Mín"
                  aria-label="Stock mínimo desde"
                  className={filterInputClass}
                />
                <span className="shrink-0 text-muted">–</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={minMax}
                  onChange={(e) => setMinMax(e.target.value)}
                  placeholder="Máx"
                  aria-label="Stock mínimo hasta"
                  className={filterInputClass}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[28px] border border-line bg-surface shadow-[0_28px_70px_-38_rgba(0,0,0,0.95)]">
        {sortedProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
              <Search size={22} aria-hidden="true" />
            </span>
            <p className="text-base font-black tracking-tight text-ink">
              Sin coincidencias
            </p>
            <p className="text-sm font-medium text-muted">
              No se encontraron productos con los filtros aplicados.
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 rounded-2xl border border-line bg-surface px-4 py-2 text-xs font-extrabold text-ink backdrop-blur-xl transition-all hover:bg-surface-3"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div key={page} className={direction === 'prev' ? 'animate-slide-left' : 'animate-slide-right'}>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className={`${thClass} w-14`}>N.º</th>
                  <th className={thClass}>
                    <button
                      type="button"
                      onClick={() => toggleSort('nombre')}
                      title="Ordenar por producto"
                      className={`inline-flex items-center gap-1.5 ${thSortableClass}`}
                    >
                      Producto {renderSortIcon('nombre')}
                    </button>
                  </th>
                  {showBarcodeColumn && <th className={thClass}>Código</th>}
                  <th className={thClass}>
                    <button
                      type="button"
                      onClick={() => toggleSort('categoria')}
                      title="Ordenar por categoría"
                      className={`inline-flex items-center gap-1.5 ${thSortableClass}`}
                    >
                      Categoría {renderSortIcon('categoria')}
                    </button>
                  </th>
                  <th className={`${thClass} text-right`}>
                    <button
                      type="button"
                      onClick={() => toggleSort('precio_venta')}
                      title="Ordenar por precio de venta"
                      className={`inline-flex items-center gap-1.5 ${thSortableClass}`}
                    >
                      Precio venta {renderSortIcon('precio_venta')}
                    </button>
                  </th>
                  <th className={`${thClass} text-right`}>
                    <button
                      type="button"
                      onClick={() => toggleSort('margen')}
                      title="Ordenar por margen"
                      className={`inline-flex items-center gap-1.5 ${thSortableClass}`}
                    >
                      Margen {renderSortIcon('margen')}
                    </button>
                  </th>
                  <th className={`${thClass} text-right`}>
                    <button
                      type="button"
                      onClick={() => toggleSort('costo')}
                      title="Ordenar por costo"
                      className={`inline-flex items-center gap-1.5 ${thSortableClass}`}
                    >
                      Costo {renderSortIcon('costo')}
                    </button>
                  </th>
                  <th className={`${thClass} text-right`}>
                    <button
                      type="button"
                      onClick={() => toggleSort('stock_actual')}
                      title="Ordenar por stock"
                      className={`inline-flex items-center gap-1.5 ${thSortableClass}`}
                    >
                      Stock {renderSortIcon('stock_actual')}
                    </button>
                  </th>
                  <th className={`${thClass} text-right`}>
                    <button
                      type="button"
                      onClick={() => toggleSort('stock_minimo')}
                      title="Ordenar por stock mínimo"
                      className={`inline-flex items-center gap-1.5 ${thSortableClass}`}
                    >
                      Mín. {renderSortIcon('stock_minimo')}
                    </button>
                  </th>
                  <th className={`${thClass} text-right`}>Estado</th>
                  <th className={`${thClass} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((product, i) => {
                  const lowStock = product.stock_actual <= product.stock_minimo
                  const margin = marginPercent(product)
                  const pinned = pinnedIds.includes(product.id)
                  const isFlashTarget = highlightId === product.id
                  return (
                    <tr
                      key={product.id}
                      data-product-id={product.id}
                      className={`border-b border-line transition-colors duration-200 last:border-none hover:bg-surface-2 ${
                        lowStock ? 'bg-rose-400/10' : ''
                      } ${pinned ? 'row-flash border border-amber-300/40 bg-amber-400/10' : ''} ${
                        isFlashTarget ? 'flash-row border border-amber-300/50' : ''
                      }`}
                    >
                      <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted">
                        {start + i + 1}
                      </td>
                      <td className="px-5 py-3 font-extrabold tracking-tight text-ink">
                        {toTitleCase(product.nombre)}
                      </td>
                      {showBarcodeColumn && (
                        <td className="px-5 py-3 font-mono text-xs text-muted">
                          {product.codigo_barras ?? '—'}
                        </td>
                      )}
                      <td className="px-5 py-3 text-sm font-medium text-muted">
                        {product.categoria.trim() === ''
                          ? '—'
                          : toTitleCase(product.categoria)}
                      </td>
                      <td className="px-5 py-3 text-right font-black tabular-nums text-amber-200">
                        {formatMoney(product.precio_venta)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {margin === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-black ${marginClass(margin)}`}
                            title="Margen de ganancia sobre el precio de venta"
                          >
                            <TrendingUp
                              size={12}
                              strokeWidth={2.5}
                              aria-hidden="true"
                            />
                            {Math.round(margin)}%
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted">
                        {product.costo > 0 ? (
                          formatMoney(product.costo)
                        ) : (
                          <span
                            className="text-xs font-extrabold text-gold"
                            title="El costo de este producto todavía no está registrado"
                          >
                            Costo pendiente
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-black tabular-nums ${
                          lowStock ? 'text-loss' : 'text-ink'
                        }`}
                      >
                        {product.stock_actual}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted">
                        {product.stock_minimo}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <StockBadge
                          stockActual={product.stock_actual}
                          stockMinimo={product.stock_minimo}
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onKardex?.(product)}
                            title="Ver movimientos del producto"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-black text-ink backdrop-blur-xl transition-all duration-200 hover:bg-surface-3 hover:text-ink active:scale-95"
                          >
                            <History size={13} strokeWidth={2.5} aria-hidden="true" />
                            Movimientos
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEdit?.(product)}
                                title="Editar producto"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-400/15 px-3 py-1.5 text-xs font-black text-sky-200 backdrop-blur-xl transition-all duration-200 hover:bg-sky-200/60 active:scale-95"
                              >
                                <Pencil size={13} strokeWidth={2.5} aria-hidden="true" />
                                Editar
                              </button>
                              {onPurchase && (
                                <button
                                  type="button"
                                  onClick={() => onPurchase(product)}
                                  title="Registrar compra"
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/35 bg-emerald-400/15 px-3 py-1.5 text-xs font-black text-emerald-200 backdrop-blur-xl transition-all duration-200 hover:bg-emerald-400/25 hover:text-emerald-100 active:scale-95"
                                >
                                  <ShoppingCart size={13} strokeWidth={2.5} aria-hidden="true" />
                                  Registrar compra
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onAdjustStock?.(product)}
                                title="Ajustar stock"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/15 px-3 py-1.5 text-xs font-black text-gold backdrop-blur-xl transition-all duration-200 hover:bg-amber-200/60 active:scale-95"
                              >
                                <PackagePlus size={13} strokeWidth={2.5} aria-hidden="true" />
                                Stock
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete?.(product)}
                                title="Eliminar producto"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/25 bg-rose-400/20 px-3 py-1.5 text-xs font-black text-loss backdrop-blur-xl transition-all duration-200 hover:bg-rose-400/35 active:scale-95"
                              >
                                <Trash2 size={13} strokeWidth={2.5} aria-hidden="true" />
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sortedProducts.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-[22px] border border-line bg-surface px-5 py-4">
          <p className="text-xs font-bold tabular-nums text-muted">
            {sortedProducts.length === 0
              ? 'Sin resultados'
              : `${start + 1}–${end} de ${sortedProducts.length}`}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => goToPage(page - 1, 'prev')}
              disabled={page <= 1}
              aria-label="Página anterior"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink backdrop-blur-xl transition-all duration-200 hover:bg-surface-3 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            {pageNumbers(page, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`gap-${i}`} className="px-1 text-xs font-bold text-muted">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPage(p, p > page ? 'next' : 'prev')}
                  aria-label={`Ir a la página ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  className={`h-9 min-w-9 rounded-xl px-2 text-sm font-black tabular-nums backdrop-blur-xl transition-all duration-200 active:scale-95 ${
                    p === page
                      ? 'border border-line-strong bg-surface-3 text-ink shadow'
                      : 'border border-line bg-surface-sub text-muted hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => goToPage(page + 1, 'next')}
              disabled={page >= totalPages}
              aria-label="Página siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink backdrop-blur-xl transition-all duration-200 hover:bg-surface-3 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs font-bold tabular-nums text-muted">
            Pág. {page} de {totalPages}
          </p>
        </div>
      )}
    </div>
  )
}
