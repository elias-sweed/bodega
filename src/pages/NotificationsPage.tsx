import { Bell, CheckCircle2, PackagePlus, ShoppingCart, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'

export function NotificationsPage() {
  const { products, loading, error, refresh } = useProducts()

  const agotados = products
    .filter((product) => product.stock_actual <= 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return (
    <div className="fade-in mx-auto flex h-full w-full max-w-4xl flex-col gap-6">
      <header className="flex shrink-0 items-center gap-4 rounded-[28px] border border-line bg-surface p-5 shadow-sm backdrop-blur-2xl">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface text-ink backdrop-blur-xl">
          <Bell size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Avisos
          </p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tighter text-ink sm:text-3xl">
            Notificaciones
          </h1>
          <p className="mt-1 truncate text-sm font-medium text-muted">
            {agotados.length === 0
              ? 'No tienes pendientes'
              : `${agotados.length} ${agotados.length === 1 ? 'producto se agotó' : 'productos se agotaron'} y ya no hay más`}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3" aria-label="Cargando productos">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="skeleton-shimmer h-24 w-full rounded-[28px]"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : error ? (
        <div className="fade-up flex flex-col items-center gap-4 rounded-[28px] border border-rose-200 bg-rose-100 p-8 text-center shadow-sm backdrop-blur-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-200/60 text-rose-700">
            <TriangleAlert size={22} aria-hidden="true" />
          </span>
          <p className="text-lg font-extrabold tracking-tight text-ink">
            No se pudieron cargar los productos
          </p>
          <p className="text-sm font-medium text-muted">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
          >
            Reintentar
          </button>
        </div>
      ) : agotados.length === 0 ? (
        <div className="fade-up flex flex-col items-center gap-3 rounded-[28px] border border-emerald-200 bg-emerald-100 p-10 text-center shadow-sm backdrop-blur-2xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={28} aria-hidden="true" />
          </span>
          <p className="mt-1 text-lg font-black tracking-tighter text-ink">
            Todo con stock disponible
          </p>
          <p className="max-w-sm text-sm font-medium text-muted">
            Aquí aparecerá un aviso cada vez que un producto se termine por
            completo, para que sepas que ya no se puede vender.
          </p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          {agotados.map((product) => (
            <li
              key={product.id}
              className="fade-up rounded-[28px] border border-rose-200 bg-rose-100 p-4 shadow-sm backdrop-blur-2xl sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-black tracking-tight text-ink">
                    {product.nombre}
                  </p>
                  <p className="text-sm font-semibold text-muted">
                    {product.categoria}
                  </p>
                  <p className="mt-2 inline-block rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-700">
                    Ya no hay más (0 unidades)
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    to={`/inventario?nuevo=${encodeURIComponent(product.nombre)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200/30 bg-sky-500 px-4 py-2.5 text-sm font-black text-white shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95"
                  >
                    <PackagePlus size={16} strokeWidth={2.5} aria-hidden="true" />
                    Crear producto nuevo
                  </Link>
                  <Link
                    to="/compras"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0 active:scale-95"
                  >
                    <ShoppingCart size={16} strokeWidth={2.5} aria-hidden="true" />
                    Reabastecer
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
