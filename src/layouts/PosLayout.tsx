import {
  BarChart3,
  History,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import logo from '../assets/logo.png'
import { UserMenu } from '../components/auth/UserMenu'
import Silk from '../components/Silk'
import { useAuth } from '../hooks/useAuth'

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-bold transition-all duration-200 sm:px-3 sm:text-sm ${
    isActive
      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
      : 'text-muted hover:bg-surface-2 hover:text-ink'
  }`
}

const NAV_ITEMS: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  adminOnly?: boolean
}[] = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/caja', label: 'Caja', icon: Wallet },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/compras', label: 'Compras', icon: ShoppingBag, adminOnly: true },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/usuarios', label: 'Usuarios', icon: Users, adminOnly: true },
]

export function PosLayout() {
  const { rol } = useAuth()
  const location = useLocation()
  const isDashboard = location.pathname === '/'
  const isCashRegister = location.pathname === '/caja'
  const isInventory = location.pathname === '/inventario'
  const isPurchases = location.pathname === '/compras'
  const isReports = location.pathname === '/reportes'
  const isHistory = location.pathname === '/historial'
  const isUsers = location.pathname === '/usuarios'
  const usesStaticAuthBackground =
    isDashboard ||
    isCashRegister ||
    isInventory ||
    isPurchases ||
    isReports ||
    isHistory ||
    isUsers
  const routeClass = isDashboard
    ? 'dashboard-route'
    : isCashRegister
      ? 'caja-route'
      : isInventory
        ? 'inventario-route'
        : isPurchases
          ? 'compras-route'
          : isReports
            ? 'reportes-route'
            : isHistory
              ? 'historial-route'
              : isUsers
                ? 'usuarios-route'
                : ''

  return (
    <div
      className={`app-shell relative flex h-screen flex-col overflow-hidden ${routeClass}`}
    >
      {!usesStaticAuthBackground && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Silk
            speed={5}
            scale={1}
            color="#5227FF"
            noiseIntensity={1.5}
            rotation={0}
          />
        </div>
      )}
      <header
        className={`relative z-40 shrink-0 border-b ${
          usesStaticAuthBackground
            ? 'border-white/10 bg-[#160d3f]/95'
            : 'border-line bg-surface/70 backdrop-blur-2xl'
        }`}
      >
        <div className="mx-auto grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4 lg:px-6 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-x-5">
          <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-2.5">
            <img
              src={logo}
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-1 shadow-md ring-1 ring-white/15"
            />
            <span className="min-w-0 leading-none">
              <span className="block truncate text-sm font-black tracking-tight text-ink sm:text-[15px]">
                Bodega EVANLU
              </span>
            </span>
          </div>

          <nav className="col-span-2 row-start-2 flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-surface/60 p-1 [scrollbar-width:none] backdrop-blur-2xl [&::-webkit-scrollbar]:hidden xl:col-span-1 xl:col-start-2 xl:row-start-1 xl:w-auto xl:justify-center">
            {NAV_ITEMS.map((item) => {
              if (item.adminOnly && rol !== 'admin') return null
              const Icon = item.icon
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                  <Icon size={15} aria-hidden="true" className="shrink-0" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="col-start-2 row-start-1 flex min-w-0 items-center justify-end gap-2 sm:gap-3 xl:col-start-3">
            <UserMenu />
          </div>
        </div>
      </header>

      <main
        className={`relative min-h-0 flex-1 overflow-hidden ${
          usesStaticAuthBackground ? 'bg-[#1a0b3d]/70' : 'bg-transparent'
        }`}
      >
        <div className="relative z-10 h-full overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
