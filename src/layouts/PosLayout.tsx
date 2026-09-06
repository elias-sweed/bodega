import type { ReactNode } from 'react'

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

export function PosLayout({ children }: PosLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex shrink-0 items-center justify-between bg-slate-900 px-6 py-3 text-white">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true">🛒</span>
          <span>Bodega POS</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <span>Caja 1</span>
          <span className="capitalize">{todayLabel()}</span>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-4 lg:p-6">{children}</main>
    </div>
  )
}