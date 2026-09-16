import { Bell, PackagePlus, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'

export function NotificationsPage() {
  const { products, loading, error, refresh } = useProducts()

  const agotados = products
    .filter((product) => product.stock_actual <= 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return (
    <div className="flex h-full flex-col gap-5">
      <header className="flex shrink-0 items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Bell size={22} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Notificaciones</h1>
          <p className="text-sm font-semibold text-slate-500">
            {agotados.length === 0
              ? 'No tienes pendientes'
              : `${agotados.length} ${agotados.length === 1 ? 'producto se agotó' : 'productos se agotaron'} y ya no hay más`}
          </p>
        </div>
      </header>

      {loading ? (
        <p className="py-10 text-center text-lg text-slate-400">
          Cargando productos…
        </p>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-rose-50 p-8 text-center">
          <p className="text-lg font-semibold text-rose-700">
            No se pudieron cargar los productos: {error}
          </p>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      ) : agotados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-10 text-center shadow-sm">
          <span className="text-4xl" aria-hidden="true">
            ✅
          </span>
          <p className="text-lg font-bold text-slate-800">
            Todo con stock disponible
          </p>
          <p className="max-w-sm text-sm font-medium text-slate-500">
            Aquí aparecerá un aviso cada vez que un producto se termine por
            completo, para que sepas que ya no se puede vender.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 overflow-y-auto">
          {agotados.map((product) => (
            <li
              key={product.id}
              className="rounded-2xl border-2 border-rose-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-slate-900">
                    {product.nombre}
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    {product.categoria}
                  </p>
                  <p className="mt-1 rounded-lg bg-rose-50 px-2 py-0.5 text-sm font-bold text-rose-700">
                    Ya no hay más de este producto (0 unidades)
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    to={`/inventario?nuevo=${encodeURIComponent(product.nombre)}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-sky-600"
                  >
                    <PackagePlus size={16} strokeWidth={2.5} aria-hidden="true" />
                    Crear producto nuevo
                  </Link>
                  <Link
                    to="/compras"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
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