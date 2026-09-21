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
      <header className="flex shrink-0 items-center gap-4 rounded-[28px] border border-white/15 bg-white/10 p-5 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-xl">
          <Bell size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/60">
            Avisos
          </p>
          <h1 className="mt-0.5 text-2xl font-black tracking-tighter text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.4)] sm:text-3xl">
            Notificaciones
          </h1>
          <p className="mt-1 truncate text-sm font-medium text-white/65">
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
        <div className="fade-up flex flex-col items-center gap-4 rounded-[28px] border border-rose-200/25 bg-rose-500/15 p-8 text-center shadow-xl backdrop-blur-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/25 text-rose-100">
            <TriangleAlert size={22} aria-hidden="true" />
          </span>
          <p className="text-lg font-extrabold tracking-tight text-white">
            No se pudieron cargar los productos
          </p>
          <p className="text-sm font-medium text-white/70">{error}</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
          >
            Reintentar
          </button>
        </div>
      ) : agotados.length === 0 ? (
        <div className="fade-up flex flex-col items-center gap-3 rounded-[28px] border border-emerald-200/25 bg-emerald-400/10 p-10 text-center shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/30 bg-emerald-400/20 text-emerald-100">
            <CheckCircle2 size={28} aria-hidden="true" />
          </span>
          <p className="mt-1 text-lg font-black tracking-tighter text-white">
            Todo con stock disponible
          </p>
          <p className="max-w-sm text-sm font-medium text-white/65">
            Aquí aparecerá un aviso cada vez que un producto se termine por
            completo, para que sepas que ya no se puede vender.
          </p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          {agotados.map((product) => (
            <li
              key={product.id}
              className="fade-up rounded-[28px] border border-rose-200/25 bg-rose-400/10 p-4 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-black tracking-tight text-white">
                    {product.nombre}
                  </p>
                  <p className="text-sm font-semibold text-white/55">
                    {product.categoria}
                  </p>
                  <p className="mt-2 inline-block rounded-full border border-rose-200/30 bg-rose-400/15 px-3 py-1 text-xs font-extrabold text-rose-100">
                    Ya no hay más (0 unidades)
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Link
                    to={`/inventario?nuevo=${encodeURIComponent(product.nombre)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200/30 bg-gradient-to-br from-sky-400/90 to-sky-600/90 px-4 py-2.5 text-sm font-black text-white shadow-[0_14px_36px_-14px_rgba(56,189,248,0.8)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-95"
                  >
                    <PackagePlus size={16} strokeWidth={2.5} aria-hidden="true" />
                    Crear producto nuevo
                  </Link>
                  <Link
                    to="/compras"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 active:translate-y-0 active:scale-95"
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
