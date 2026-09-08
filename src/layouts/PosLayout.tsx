import { NavLink, Outlet } from 'react-router-dom'
import { UserMenu } from '../components/auth/UserMenu'

function todayLabel(): string {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-white/15 text-white'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`
}

export function PosLayout() {
  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 px-6 py-3 text-white">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true">🛒</span>
          <span>Bodega POS</span>
        </div>
        <nav className="flex flex-wrap items-center gap-1 lg:gap-2">
          <NavLink to="/" end className={navLinkClass}>
            Resumen
          </NavLink>
          <NavLink to="/caja" className={navLinkClass}>
            Caja
          </NavLink>
          <NavLink to="/inventario" className={navLinkClass}>
            Inventario
          </NavLink>
          <NavLink to="/compras" className={navLinkClass}>
            Compras
          </NavLink>
          <NavLink to="/historial" className={navLinkClass}>
            Historial
          </NavLink>
        </nav>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-300 md:inline">
            {todayLabel()}
          </span>
          <UserMenu />
        </div>
      </header>

      <main className="min-h-0 flex-1 p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  )
}