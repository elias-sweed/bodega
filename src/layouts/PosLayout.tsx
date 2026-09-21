import { NavLink, Outlet } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Silk from '../components/Silk'
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
  return `rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-white/15 text-white'
      : 'text-slate-300 hover:bg-white/10 hover:text-white'
  }`
}

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
          {rol === 'admin' && (
            <NavLink to="/usuarios" className={navLinkClass}>
              Usuarios
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-300 md:inline">
            {todayLabel()}
          </span>
          <NavLink
            to="/notificaciones"
            aria-label="Notificaciones de productos agotados"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
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
      </header>

      {notifToast && (
        <NavLink
          to="/notificaciones"
          onClick={() => setNotifToast(null)}
          role="status"
          className="fixed right-4 top-16 z-50 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg">
            <Bell size={20} fill="currentColor" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-black text-slate-900">
              {notifToast.count}{' '}
              {notifToast.count === 1 ? 'nueva notificación' : 'nuevas notificaciones'}
            </span>
            <span className="block text-xs font-semibold text-slate-500">
              «{notifToast.producto}» se agotó
            </span>
          </span>
        </NavLink>
      )}

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Silk
            speed={5}
            scale={1}
            color="#5227FF"
            noiseIntensity={0.95}
            rotation={0}
          />
        </div>
        <div className="relative z-10 h-full overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}