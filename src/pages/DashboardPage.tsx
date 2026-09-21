import { useCallback } from 'react'
import { AlertTriangle, PackageSearch, RefreshCw } from 'lucide-react'
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton'
import { GastoMesCard } from '../components/dashboard/GastoMesCard'
import { LowStockList } from '../components/dashboard/LowStockList'
import { MetodoDonut } from '../components/dashboard/MetodoDonut'
import { QuickActions } from '../components/dashboard/QuickActions'
import { SalesTodayCard } from '../components/dashboard/SalesTodayCard'
import { StockResumenCard } from '../components/dashboard/StockResumenCard'
import { WeeklySalesChart } from '../components/dashboard/WeeklySalesChart'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useWeeklySales } from '../hooks/useWeeklySales'

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
  const { resumen, lowStock, loading, isRefreshing, error, updatedAt, refresh } =
    useDashboardStats()
  const { dias, ayerTotal, loading: weeklyLoading } = useWeeklySales()
  const retry = useCallback((): void => refresh(), [refresh])
  const freshness = timeAgo(updatedAt)

  // Primera vez (sin caché): skeletons premium
  if (loading && resumen === null) {
    return (
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6">
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
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6">
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
              <QuickActions />
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
