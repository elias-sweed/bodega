import { useCallback } from 'react'
import { LowStockList } from '../components/dashboard/LowStockList'
import { SalesTodayCard } from '../components/dashboard/SalesTodayCard'
import { useDashboardStats } from '../hooks/useDashboardStats'

export function DashboardPage() {
  const { ventasHoy, lowStock, loading, error, refresh } = useDashboardStats()
  const retry = useCallback((): void => refresh(), [refresh])

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <header className="flex shrink-0 items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Resumen del día</h1>
          <p className="text-sm text-slate-500">
            Todo lo que necesitas saber de tu bodega hoy.
          </p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="h-11 rounded-xl bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          Actualizar
        </button>
      </header>

      {loading ? (
        <p className="py-10 text-center text-lg text-slate-400">
          Cargando resumen…
        </p>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-rose-50 p-8 text-center">
          <p className="text-lg font-semibold text-rose-700">
            No se pudo cargar el resumen: {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <SalesTodayCard total={ventasHoy} />

          <section>
            <h2 className="text-xl font-black text-slate-900">
              Atención: Productos por agotarse
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              {lowStock.length}{' '}
              {lowStock.length === 1
                ? 'producto requiere'
                : 'productos requieren'}{' '}
              reabastecimiento.
            </p>
            <LowStockList products={lowStock} />
          </section>
        </>
      )}
    </div>
  )
}