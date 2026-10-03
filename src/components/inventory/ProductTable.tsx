/* oxlint-disable react/set-state-in-effect -- La paginación se reinicia al cambiar filtros. */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  PackagePlus,
  Pencil,
  Search,
  Tags,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'
import { formatMoney, toTitleCase } from '../../utils/format'
import { StockBadge } from './StockBadge'
import { HelpTip } from '../common/HelpTip'

interface ProductTableProps {
  products: ProductosRow[]
  isAdmin?: boolean
  onEdit?: (product: ProductosRow) => void
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
const FILTER_STORAGE_KEY = 'inventario:filtros:v2'

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

/** Chip de filtro de stock: "todos" | "por_agotar" | "agotados" */
type ChipFiltro = 'todos' | 'por_agotar' | 'agotados'

interface PersistedFilters {
  search?: string
  category?: string
  chip?: ChipFiltro
  recientes?: boolean
}

/** Clave del sort persistido: solo las 4 opciones simples */
type SortKey = 'nombre' | 'categoria' | 'precio_venta' | 'stock_actual'

interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}

function marginPercent(product: ProductosRow): number | null {
  if (product.precio_venta <= 0 || product.costo <= 0) return null
  return ((product.precio_venta - product.costo) / product.precio_venta) * 100
}

function marginClass(margin: number): string {
  if (margin < 0) return 'border-rose-400/40 bg-rose-400/15 text-loss'
  if (margin < 20) return 'border-gold/40 bg-gold/15 text-gold'
  return 'border-profit/40 bg-profit/15 text-profit'
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

export function ProductTable({
  products,
  isAdmin = false,
  onEdit,
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
  const [chipFiltro, setChipFiltro] = useState<ChipFiltro>(persisted.chip ?? 'todos')
  const [recientes, setRecientes] = useState(persisted.recientes ?? false)
  const [page, setPage] = useState(1)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [sort, setSort] = useState<SortState>({ key: 'nombre', dir: 'asc' })
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

  /** Opciones disponibles para el selector de orden */
  const sortKeyLabels: { key: SortKey; label: string }[] = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'precio_venta', label: 'Precio' },
    { key: 'stock_actual', label: 'Cantidad' },
  ]

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
      if (chipFiltro === 'agotados' && product.stock_actual > 0) return false
      if (
        chipFiltro === 'por_agotar' &&
        !(product.stock_actual > 0 && product.stock_actual <= product.stock_minimo)
      ) {
        return false
      }
      return true
    })
  }, [products, search, category, chipFiltro, recientes, recientesIds])

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
      const factor = sort.dir === 'asc' ? 1 : -1
      switch (sort.key) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre, 'es') * factor
        case 'categoria':
          return a.categoria.localeCompare(b.categoria, 'es') * factor
        case 'precio_venta':
          return (a.precio_venta - b.precio_venta) * factor
        case 'stock_actual':
          return (a.stock_actual - b.stock_actual) * factor
      }
    })
    return items
  }, [filteredProducts, sort, pinnedIds, recientes])

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE))

  // Al cambiar cualquier filtro se vuelve a la primera página
  useEffect(() => {
    setPage(1)
    setDirection('next')
  }, [search, category, chipFiltro, recientes])

  // Los filtros sobreviven a salir/volver a la sección Inventario
  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ search, category, chip: chipFiltro, recientes }),
      )
    } catch {
      // Sin almacenamiento disponible: se ignora
    }
  }, [search, category, chipFiltro, recientes])

  // Si la lista se achica (ej. eliminan), no quedarse en una página vacía
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  /** ¿Hay algún filtro activo además del sort? */
  const hasActiveFilters =
    search !== '' || category !== 'todas' || chipFiltro !== 'todos' || recientes

  const resetAllFilters = (): void => {
    setSearch('')
    setCategory('todas')
    setChipFiltro('todos')
    setRecientes(false)
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

  const start = (page - 1) * PAGE_SIZE
  const pageItems = sortedProducts.slice(start, start + PAGE_SIZE)
  const end = start + pageItems.length

  return (
    <div ref={topRef} className="space-y-4 pb-8">
      {/* ── Fila de filtros siempre visibles ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Búsqueda */}
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

        {/* Categoría */}
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

        {/* Chip: Recientes */}
        <button
          type="button"
          onClick={() => setRecientes((value) => !value)}
          aria-pressed={recientes}
          title="Mostrar solo los productos agregados recientemente"
          className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold backdrop-blur-2xl transition-all duration-300 active:scale-95 ${
            recientes
              ? 'border-sky-400/40 bg-sky-400/15 text-sky-200'
              : 'border-line bg-surface text-ink hover:bg-surface-2'
          }`}
        >
          <Clock3 size={16} aria-hidden="true" />
          Recientes
        </button>

        <HelpTip
          title="Filtro Recientes"
          text="Apretas este botón y la lista solo te muestra los productos que agregaste hace poco. No borra ni esconde para siempre: lo aprietas otra vez y vuelves a ver todo."
          example="Agregaste 3 productos nuevos hoy. Toca 'Recientes' para verlos rápido sin buscar uno por uno."
        />

        {/* Chip: Por agotar */}
        <button
          type="button"
          onClick={() =>
            setChipFiltro((prev) => (prev === 'por_agotar' ? 'todos' : 'por_agotar'))
          }
          aria-pressed={chipFiltro === 'por_agotar'}
          title="Ver productos que están por agotarse (quedan pocas unidades)"
          className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold backdrop-blur-2xl transition-all duration-300 active:scale-95 ${
            chipFiltro === 'por_agotar'
              ? 'border-amber-300/50 bg-amber-400/20 text-gold'
              : 'border-line bg-surface text-ink hover:bg-surface-2'
          }`}
        >
          🔴 Por agotar
        </button>

        {/* Chip: Agotados */}
        <button
          type="button"
          onClick={() =>
            setChipFiltro((prev) => (prev === 'agotados' ? 'todos' : 'agotados'))
          }
          aria-pressed={chipFiltro === 'agotados'}
          title="Ver productos sin stock (agotados)"
          className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-extrabold backdrop-blur-2xl transition-all duration-300 active:scale-95 ${
            chipFiltro === 'agotados'
              ? 'border-rose-300/50 bg-rose-400/20 text-loss'
              : 'border-line bg-surface text-ink hover:bg-surface-2'
          }`}
        >
          ⬛ Agotados
        </button>

        {/* Contador */}
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold text-muted backdrop-blur-xl">
          {sortedProducts.length} de {products.length}
        </span>

        {/* Limpiar todo */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            title="Quitar todos los filtros aplicados"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-rose-300/50 bg-rose-500/25 px-4 text-sm font-black tracking-tight text-ink shadow-sm backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200/70 hover:bg-rose-500/40 active:translate-y-0 active:scale-95"
          >
            <X size={17} strokeWidth={3} aria-hidden="true" />
            Limpiar
          </button>
        )}

        {/* Selector de orden único — Fase 3 */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
            🔃 Ordenar por:
          </span>
          <select
            value={sort.key}
            onChange={(e) =>
              setSort((prev) => ({ ...prev, key: e.target.value as SortKey }))
            }
            aria-label="Ordenar por"
            className="h-9 cursor-pointer appearance-none rounded-xl border border-line bg-surface px-3 pr-7 text-sm font-bold text-ink outline-none focus:border-amber-300/70 [&>option]:bg-[#241b66] [&>option]:text-slate-100"
          >
            {sortKeyLabels.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() =>
              setSort((prev) => ({ ...prev, dir: prev.dir === 'asc' ? 'desc' : 'asc' }))
            }
            title={sort.dir === 'asc' ? 'Orden ascendente — clic para invertir' : 'Orden descendente — clic para invertir'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink backdrop-blur-xl transition-all duration-200 hover:bg-surface-3 active:scale-95"
          >
            {sort.dir === 'asc' ? (
              <ArrowUp size={15} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <ArrowDown size={15} strokeWidth={2.5} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ── Tabla ── */}
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
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
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
                  <th className={thClass}>Producto</th>
                  {showBarcodeColumn && <th className={thClass}>Código</th>}
                  <th className={thClass}>Categoría</th>
                  <th className={`${thClass} text-right`}>Precio venta</th>
                  <th className={`${thClass} text-right`}>
                    <span className="inline-flex items-center gap-1.5">
                      Ganas
                    </span>
                  </th>
                  <th className={`${thClass} text-right`}>Costo</th>
                  <th className={`${thClass} text-right`}>Cantidad</th>
                  <th className={`${thClass} text-right`}>Mín. cantidad</th>
                  <th className={`${thClass} text-right`}>
                    <span className="inline-flex items-center gap-1.5">
                      Estado
                      <HelpTip
                        title="Estado de la cantidad"
                        text="Te dice si te queda suficiente, poco o nada de ese producto. 'Mín.' es la cantidad mínima que quieres tener siempre: cuando bajas de eso, se marca en rojo."
                        example="Si tu mínimo de gaseosa es 10 y te quedan 8, el producto se marca en rojo para que compres más."
                      />
                    </span>
                  </th>
                  <th className={`${thClass} text-right`}>
                    <span className="inline-flex items-center gap-1.5">
                      Acciones
                      <HelpTip
                        title="Botones de acciones"
                        text="En cada fila tienes botones para: editar los datos del producto, registrar una compra que llegó, corregir la cantidad (merma o conteo), ver su historial y eliminarlo."
                        example="Se rompieron 2 atunes: usa 'Ajustar' para descontarlos. Llegó mercadería: usa 'Registrar compra'."
                      />
                    </span>
                  </th>
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
                            title="Lo que ganas en cada unidad vendida"
                          >
                            <TrendingUp
                              size={12}
                              strokeWidth={2.5}
                              aria-hidden="true"
                            />
                            {formatMoney(product.precio_venta - product.costo)}
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
                              <button
                                type="button"
                                onClick={() => onAdjustStock?.(product)}
                                title="Ajustar stock"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/15 px-3 py-1.5 text-xs font-black text-gold backdrop-blur-xl transition-all duration-200 hover:bg-amber-200/60 active:scale-95"
                              >
                                <PackagePlus size={13} strokeWidth={2.5} aria-hidden="true" />
                                Ajustar
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

      {/* ── Paginación ── */}
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
