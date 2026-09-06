import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface PosLayoutProps {
  children: ReactNode
}

function todayLabel(): string {
  return new Date().toLocaleDateString('es-MX', {
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

export function PosLayout({ children }: PosLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-4 bg-slate-900 px-6 py-3 text-white">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true">🛒</span>
          <span>Bodega POS</span>
        </div>
        <nav className="flex items-center gap-2">
          <NavLink to="/" end className={navLinkClass}>
            Caja
          </NavLink>
          <NavLink to="/inventario" className={navLinkClass}>
            Inventario
          </NavLink>
          <NavLink to="/compras" className={navLinkClass}>
            Compras
          </NavLink>
        </nav>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <span>Caja 1</span>
          <span className="hidden capitalize md:inline">{todayLabel()}</span>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-4 lg:p-6">{children}</main>
    </div>
  )
}