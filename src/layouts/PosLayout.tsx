import {
  BarChart3,
  CalendarDays,
  History,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Wallet,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { UserMenu } from '../components/auth/UserMenu'
import Silk from '../components/Silk'
import { useAuth } from '../hooks/useAuth'

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

  return (
    <div className="app-shell relative flex h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Silk
          speed={5}
          scale={1}
          color="#5227FF"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>
      <header className="relative z-40 shrink-0 border-b border-line bg-surface/70 backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 lg:px-6">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 text-base shadow-lg shadow-violet-900/40 ring-1 ring-white/10"
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

          <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-surface/60 p-1 backdrop-blur-2xl lg:order-none lg:w-auto lg:justify-center">
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

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-2 rounded-2xl border border-line bg-surface/60 px-3 py-2 text-xs font-bold capitalize text-muted backdrop-blur-2xl xl:inline-flex">
              <CalendarDays size={14} aria-hidden="true" className="text-muted" />
              {todayLabel()}
            </span>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div className="relative z-10 h-full overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
