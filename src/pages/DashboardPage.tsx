import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarDays, PackageSearch, ShoppingCart, Sparkles, X } from 'lucide-react'
import { DashboardHero } from '../components/dashboard/DashboardHero'
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton'
import { GastoMesCard } from '../components/dashboard/GastoMesCard'
import { LowStockList } from '../components/dashboard/LowStockList'
import { MetodoDonut } from '../components/dashboard/MetodoDonut'
import { QuickActions } from '../components/dashboard/QuickActions'
import { SalesTodayCard } from '../components/dashboard/SalesTodayCard'
import { StockResumenCard } from '../components/dashboard/StockResumenCard'
import { TodayProducts } from '../components/dashboard/TodayProducts'
import { WeeklySalesChart } from '../components/dashboard/WeeklySalesChart'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useTodayProducts } from '../hooks/useTodayProducts'
import { useWeeklySales } from '../hooks/useWeeklySales'
import { claveHoy } from '../utils/format'

function timeAgo(savedAt: number | null): string | null {
  if (!savedAt) return null
  const diff = Date.now() - savedAt
  if (diff < 45_000) return 'actualizado hace segundos'
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'actualizado hace segundos'
  if (min === 1) return 'actualizado hace 1 min'
  if (min < 60) return `actualizado hace ${min} min`
  const h = Math.floor(min / 60)
  return h === 1 ? 'actualizado hace 1 h' : `actualizado hace ${h} h`
}

export function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // Vista de un día pasado (llega desde Historial). Vive solo en la
  // navegación: cambiar de sección o usar el menú vuelve al día de hoy;
  // recargar conserva el día porque el navegador guarda el estado.
  // Si el día pedido es hoy no hay vista de día: el dashboard ya es hoy.
  const fechaVistaPedida =
    (location.state as { fechaVista?: string } | null)?.fechaVista ?? null
  const fechaVista = fechaVistaPedida === claveHoy() ? null : fechaVistaPedida

  const rangoDia = useMemo(() => {
    if (!fechaVista) return undefined
    const [y, m, d] = fechaVista.split('-').map(Number)
    if (!y || !m || !d) return undefined
    const desde = new Date(y, m - 1, d)
    const hasta = new Date(y, m - 1, d + 1)
    return { desde, hasta, clave: fechaVista }
  }, [fechaVista])

  const { resumen, lowStock, loading, isRefreshing, error, updatedAt, refresh } =
    useDashboardStats()
  const { dias, ayerTotal, loading: weeklyLoading } = useWeeklySales()
  const { productos: productosHoy, loading: productosLoading } = useTodayProducts()
  const dia = useTodayProducts(rangoDia, rangoDia ? `dia-${rangoDia.clave}` : 'hoy', !!rangoDia)
  const retry = useCallback((): void => refresh(), [refresh])
  const freshness = timeAgo(updatedAt)

  const cerrarVista = useCallback((): void => {
    navigate('/', { replace: true, state: {} })
  }, [navigate])

  const volverHistorial = useCallback((): void => {
    navigate('/historial')
  }, [navigate])

  // ---- MODO VISTA DE DÍA (desde Historial) ----
  if (rangoDia) {
    // "viernes 19 de septiembre 2026" para nombrar el día en cada título
    const diaSemana = rangoDia.desde.toLocaleDateString('es-PE', { weekday: 'long' })
    const diaMes = rangoDia.desde.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })
    const etiqueta = `${diaSemana} ${diaMes} ${rangoDia.desde.getFullYear()}`
    const etiquetaCorta = rangoDia.desde.toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'short',
    })
    const resumenDia = {
      ventas_hoy_total: dia.total,
      ventas_hoy_count: dia.count,
      efectivo_hoy: dia.efectivo,
      yape_hoy: dia.yape,
      plin_hoy: dia.plin,
      ganancia_estimada_hoy: dia.ganancia,
    }
    return (
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 pb-10">
        <div className="fade-in flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-amber-200/40 bg-amber-400/15 px-5 py-3.5 shadow-sm backdrop-blur-2xl">
          <p className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-ink">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 text-gold">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black tracking-tight capitalize">
                Resumen del {etiqueta}
              </span>
              <span className="block text-xs font-semibold text-muted">
                Vista de ese día (no es hoy)
              </span>
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={volverHistorial}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-line bg-surface px-4 text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-95"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Volver al Historial
            </button>
            <button
              type="button"
              onClick={cerrarVista}
              aria-label="Cerrar vista y ver hoy"
              title="Cerrar y ver hoy"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line bg-surface text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-95"
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        </div>

        {dia.loading && dia.total === 0 && dia.productos.length === 0 ? (
          <DashboardSkeleton />
        ) : (
          <div className="fade-in flex flex-col gap-6">
            <SalesTodayCard resumen={resumenDia} etiqueta={`Ventas del ${etiqueta}`} />
            <MetodoDonut
              efectivo={dia.efectivo}
              yape={dia.yape}
              plin={dia.plin}
              titulo={`Método de pago del ${etiqueta}`}
              centro={etiquetaCorta}
              vacio="Sin cobros ese día. Al vender, aquí verás cómo te pagaron."
            />
            <TodayProducts
              productos={dia.productos}
              loading={dia.loading}
              titulo={`Productos del ${etiqueta}`}
              subtitulo="Lo cobrado y lo ganado de cada producto ese día."
              vacio="Sin ventas registradas ese día."
            />
          </div>
        )}
      </div>
    )
  }

  // Primera vez (sin caché): skeletons premium
  if (loading && resumen === null) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 pb-10">
        <DashboardHero subtitulo="Preparando tu resumen premium…" />
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 pb-10">
      <DashboardHero
        subtitulo="Todo lo que necesitas saber de tu bodega hoy."
        freshness={freshness}
        isRefreshing={isRefreshing}
        onRefresh={retry}
      />

      {error && resumen === null ? (
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-200/25 bg-rose-500/15 p-8 text-center shadow-sm backdrop-blur-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/25 text-loss">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <p className="text-lg font-extrabold tracking-tight text-ink">
            Todavía no hay resumen que mostrar
          </p>
          <p className="max-w-md text-sm font-medium text-muted">
            Si es tu primer día, es normal: el resumen aparecerá con tus
            primeras ventas. Si no, puede ser un pequeño susto de conexión.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/caja')}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-5 text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0"
            >
              Ir a la Caja
            </button>
            <button
              type="button"
              onClick={retry}
              className="rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Reintentar
            </button>
          </div>
        </div>
      ) : resumen === null ? (
        <DashboardSkeleton />
      ) : (
        <div className="fade-in flex flex-col gap-6">
          {resumen.ventas_hoy_count === 0 && resumen.ventas_hoy_total === 0 && (
            <section className="relative shrink-0 overflow-hidden rounded-[28px] border border-gold/40 bg-gold/10 p-6 shadow-sm backdrop-blur-2xl sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-xl font-black tracking-tighter text-gold">
                    <Sparkles size={20} aria-hidden="true" />
                    Aún no has vendido hoy
                  </h2>
                  <p className="mt-1 text-sm font-medium text-muted">
                    Aquí verás tu resumen del día apenas registres tu primera
                    venta. No hay nada que mostrar todavía, y eso está bien.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/caja')}
                  className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-gold/40 bg-gold px-6 text-sm font-black tracking-tight text-amber-950 shadow-[0_10px_30px_-12px_rgba(251,191,36,0.6)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]"
                >
                  <ShoppingCart size={17} aria-hidden="true" />
                  Registrar mi primera venta
                </button>
              </div>
            </section>
          )}

          <SalesTodayCard resumen={resumen} ayerTotal={ayerTotal} />

          <WeeklySalesChart dias={dias} loading={weeklyLoading} />

          <TodayProducts productos={productosHoy} loading={productosLoading} />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <GastoMesCard total={resumen.gasto_compras_mes} />
            <StockResumenCard
              total={resumen.total_productos}
              bajos={resumen.bajos_stock}
              agotados={resumen.agotados}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <MetodoDonut
              efectivo={resumen.efectivo_hoy}
              yape={resumen.yape_hoy}
              plin={resumen.plin_hoy}
            />
            <QuickActions />
          </div>

          <section className="rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black tracking-tighter text-ink">
                  <PackageSearch size={20} aria-hidden="true" className="text-ink" />
                  Atención: productos por agotarse
                </h2>
                <p className="mt-1 text-sm font-medium text-muted">
                  {lowStock.length}{' '}
                  {lowStock.length === 1
                    ? 'producto requiere'
                    : 'productos requieren'}{' '}
                  reabastecimiento.
                </p>
              </div>
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-black text-ink">
                {lowStock.length} ítems
              </span>
            </div>
            <div className="mt-5">
              <LowStockList products={lowStock} />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
