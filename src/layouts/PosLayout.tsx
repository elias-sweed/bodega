import { NavLink, Outlet } from 'react-router-dom'
import { BarChart3, Bell, CalendarDays, History, LayoutDashboard, Package, ShoppingBag, Users, Wallet } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UserMenu } from '../components/auth/UserMenu'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'

function todayLabel(): string {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-all duration-200 ${
    isActive
      ? 'bg-emerald-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`
}

const NAV_ITEMS: { to: string; label: string; icon: typeof Bell; end?: boolean }[] = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/caja', label: 'Caja', icon: Wallet },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/compras', label: 'Compras', icon: ShoppingBag },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/usuarios', label: 'Usuarios', icon: Users },
]

export function PosLayout() {
  const { rol } = useAuth()
  const { products } = useProducts()
  const agotados = products.filter((product) => product.stock_actual <= 0)

  const agotadosIds = useMemo(
    () => new Set(agotados.map((product) => product.id)),
    [agotados],
  )
  const prevStocks = useRef(new Map<string, number>())
  const firstSync = useRef(true)
  const [notifToast, setNotifToast] = useState<{
    count: number
    producto: string
  } | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const currentStocks = new Map(products.map((p) => [p.id, p.stock_actual]))
    if (firstSync.current) {
      firstSync.current = false
      prevStocks.current = currentStocks
      return
    }
    // Solo avisa si el producto TENÍA stock y se agotó (una venta lo vació).
    // Un producto recién creado con stock 0 nunca tuvo stock: no dispara aviso.
    const nuevos = [...agotadosIds].filter((id) => {
      const prev = prevStocks.current.get(id)
      return prev !== undefined && prev > 0
    })
    if (nuevos.length > 0) {
      const ultimo = agotados.find((product) => product.id === nuevos[nuevos.length - 1])
      setNotifToast({
        count: agotadosIds.size,
        producto: ultimo?.nombre ?? 'un producto',
      })
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setNotifToast(null), 5000)
    }
    prevStocks.current = currentStocks
  }, [agotadosIds, agotados, products])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="relative z-40 shrink-0 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 lg:px-6">
          {/* marca */}
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-base shadow-sm"
            >
              🛒
            </span>
            <span className="leading-none">
              <span className="block text-[15px] font-black tracking-tight text-ink">
                Bodega POS
              </span>
              <span className="mt-0.5 block text-[9px] font-extrabold uppercase tracking-[0.22em] text-muted">
                Panel de ventas
              </span>
            </span>
          </div>

          {/* navegación */}
          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1 lg:order-none lg:w-auto lg:justify-center">
            {NAV_ITEMS.map((item) => {
              if (item.to === '/usuarios' && rol !== 'admin') return null
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                  <Icon size={15} aria-hidden="true" className="shrink-0" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          {/* acciones */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold capitalize text-muted xl:inline-flex">
              <CalendarDays size={14} aria-hidden="true" className="text-slate-400" />
              {todayLabel()}
            </span>
            <NavLink
              to="/notificaciones"
              aria-label="Notificaciones de productos agotados"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:text-slate-900"
            >
              <Bell size={20} aria-hidden="true" />
              {agotados.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-black text-white">
                  {agotados.length}
                </span>
              )}
            </NavLink>
            <UserMenu />
          </div>
        </div>
      </header>

      {notifToast && (
        <NavLink
          to="/notificaciones"
          onClick={() => setNotifToast(null)}
          role="status"
          className="fixed right-4 top-16 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
            <Bell size={20} fill="currentColor" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-black text-slate-900">
              {notifToast.count}{' '}
              {notifToast.count === 1 ? 'nueva notificación' : 'nuevas notificaciones'}
            </span>
            <span className="block text-xs font-semibold text-muted/70">
              «{notifToast.producto}» se agotó
            </span>
          </span>
        </NavLink>
      )}

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}