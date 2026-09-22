import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CalendarDays, PackageSearch, RefreshCw, X } from 'lucide-react'
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
        <div className="fade-in flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-amber-200/40 bg-amber-400/15 px-5 py-3.5 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <p className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-white">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200/30 bg-amber-400/25 text-amber-100">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black tracking-tight capitalize">
                Resumen del {etiqueta}
              </span>
              <span className="block text-xs font-semibold text-white/60">
                Vista de ese día (no es hoy)
              </span>
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={volverHistorial}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-white/25 bg-white/10 px-4 text-sm font-extrabold text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/20 active:scale-95"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Volver al Historial
            </button>
            <button
              type="button"
              onClick={cerrarVista}
              aria-label="Cerrar vista y ver hoy"
              title="Cerrar y ver hoy"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/20 active:scale-95"
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
        <header className="flex shrink-0 flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/60">
              Bodega · Panel
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.4)] sm:text-4xl">
              Resumen del día
            </h1>
            <p className="mt-1 text-sm font-medium text-white/65">
              Preparando tu resumen premium…
            </p>
          </div>
        </header>
        <DashboardSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 pb-10">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/60">
            Bodega · Panel
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.4)] sm:text-4xl">
            Resumen del día
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-white/65">
            Todo lo que necesitas saber de tu bodega hoy.
            {freshness && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white/75 backdrop-blur-xl">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isRefreshing ? 'animate-pulse bg-amber-300' : 'bg-emerald-300'}`}
                />
                {isRefreshing ? 'actualizando…' : freshness}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          disabled={isRefreshing}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-5 text-sm font-extrabold tracking-tight text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/25 active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={isRefreshing ? 'animate-spin' : ''}
          />
          {isRefreshing ? 'Actualizando' : 'Actualizar'}
        </button>
      </header>

      {error && resumen === null ? (
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-200/25 bg-rose-500/15 p-8 text-center shadow-xl backdrop-blur-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/25 text-rose-100">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <p className="text-lg font-extrabold tracking-tight text-white">
            No se pudo cargar el resumen
          </p>
          <p className="text-sm font-medium text-white/70">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Reintentar
          </button>
        </div>
      ) : resumen === null ? (
        <DashboardSkeleton />
      ) : (
        <div className="fade-in flex flex-col gap-6">
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

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <MetodoDonut
                efectivo={resumen.efectivo_hoy}
                yape={resumen.yape_hoy}
                plin={resumen.plin_hoy}
              />
            </div>
            <div className="xl:col-span-2">
              <QuickActions layout="stack" />
            </div>
          </div>

          <section className="rounded-[28px] border border-white/15 bg-white/[0.07] p-6 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black tracking-tighter text-white">
                  <PackageSearch size={20} aria-hidden="true" className="text-white/80" />
                  Atención: productos por agotarse
                </h2>
                <p className="mt-1 text-sm font-medium text-white/60">
                  {lowStock.length}{' '}
                  {lowStock.length === 1
                    ? 'producto requiere'
                    : 'productos requieren'}{' '}
                  reabastecimiento.
                </p>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black text-white/80">
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
