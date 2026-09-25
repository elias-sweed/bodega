import { useMemo, useState } from 'react'
import { BarChart3, CalendarDays, Download, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react'
import { ReportesSkeleton } from '../components/reportes/ReportesSkeleton'
import { useReporteMensual } from '../hooks/useReporteMensual'
import { exportCsv } from '../utils/exportCsv'
import { formatMoney } from '../utils/format'

type Periodo = 'dia' | 'semana' | 'mes'

function inputDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function etiquetaPeriodo(periodo: Periodo, desde: Date, hasta: Date): string {
  if (periodo === 'dia') {
    return desde.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (periodo === 'semana') {
    return `${desde.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })} – ${hasta.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })}`
  }
  return desde.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
}

function rango(periodo: Periodo, fecha: Date): { desde: Date; hasta: Date } {
  const desde = new Date(fecha)
  if (periodo === 'dia') {
    desde.setHours(0, 0, 0, 0)
    const hasta = new Date(desde)
    hasta.setDate(hasta.getDate() + 1)
    return { desde, hasta }
  }
  if (periodo === 'semana') {
    const day = desde.getDay()
    desde.setDate(desde.getDate() + (day === 0 ? -6 : 1 - day))
    desde.setHours(0, 0, 0, 0)
    const hasta = new Date()
    hasta.setHours(23, 59, 59, 999)
    return { desde, hasta }
  }
  desde.setDate(1)
  desde.setHours(0, 0, 0, 0)
  const hasta = new Date(desde)
  hasta.setMonth(hasta.getMonth() + 1)
  return { desde, hasta }
}

function MetricCard({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'profit' | 'loss' }) {
  const color = tone === 'profit' ? 'text-profit' : tone === 'loss' ? 'text-loss' : 'text-ink'
  return (
    <div className="rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_60px_-32_rgba(0,0,0,0.95)]">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-black tracking-tight ${color}`}>{value}</p>
    </div>
  )
}

function ReporteResumen({ periodo, fecha }: { periodo: Periodo; fecha: Date }) {
  const dates = useMemo(() => rango(periodo, fecha), [periodo, fecha])
  const etiqueta = useMemo(
    () => etiquetaPeriodo(periodo, dates.desde, dates.hasta),
    [periodo, dates.desde, dates.hasta],
  )
  const { reporte, loading, error, refresh } = useReporteMensual(dates.desde, dates.hasta)

  const exportar = (): void => {
    const rows: (string | number)[][] = [
      [`Reporte — ${etiqueta}`],
      [],
      ['Concepto', 'Importe'],
      ['Ventas cobradas', reporte.totalVentas],
      ['Costo de productos vendidos', reporte.cogs],
      ['Ganancia estimada de ventas', reporte.gananciaEstimada],
      ['Compras del periodo', reporte.comprasMes],
      ['Pérdidas registradas', reporte.perdidasTotales],
      [],
      ['Método de pago', 'Importe'],
      ...reporte.ventasPorMetodo.map((metodo) => [metodo.metodo, metodo.total]),
      [],
      ['Producto', 'Unidades', 'Cobrado', 'Ganancia estimada'],
      ...reporte.productosMasVendidos.map((producto) => [
        producto.nombre,
        producto.cantidad,
        producto.cobrado,
        producto.ganancia,
      ]),
    ]
    exportCsv(rows, `reporte-${periodo}-${inputDate(fecha)}.csv`)
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-400/30 bg-rose-400/10 p-8 text-center">
        <p className="text-base font-extrabold text-ink">No se pudo cargar el reporte</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-rose-300/40 bg-rose-500 px-4 py-2 text-sm font-black text-white"
        >
          <RotateCcw size={15} aria-hidden="true" /> Reintentar
        </button>
      </div>
    )
  }

  if (loading) {
    return <ReportesSkeleton />
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={exportar}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 px-4 text-sm font-black uppercase tracking-widest text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.55)]"
        >
          <Download size={16} aria-hidden="true" /> Exportar para Excel
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ventas cobradas" value={formatMoney(reporte.totalVentas)} />
        <MetricCard
          label="Ganancia estimada"
          value={formatMoney(reporte.gananciaEstimada)}
          tone={reporte.gananciaEstimada >= 0 ? 'profit' : 'loss'}
        />
        <MetricCard label="Compras del periodo" value={formatMoney(reporte.comprasMes)} />
        <MetricCard label="Operaciones de venta" value={String(reporte.numeroVentas)} />
      </div>

      <section className="rounded-[28px] border border-line bg-surface p-6 shadow-[0_28px_70px_-38_rgba(0,0,0,0.95)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-muted">Resumen</p>
            <h2 className="mt-1 text-xl font-black text-ink">{etiqueta}</h2>
          </div>
          {reporte.gananciaEstimada >= 0 ? (
            <TrendingUp className="text-profit" aria-hidden="true" />
          ) : (
            <TrendingDown className="text-loss" aria-hidden="true" />
          )}
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-sub px-4 py-3">
            <dt className="text-xs font-bold text-muted">Costo de productos vendidos</dt>
            <dd className="mt-1 font-black text-ink">{formatMoney(reporte.cogs)}</dd>
          </div>
          <div className="rounded-2xl bg-surface-sub px-4 py-3">
            <dt className="text-xs font-bold text-muted">Compras / gastos de mercadería</dt>
            <dd className="mt-1 font-black text-ink">{formatMoney(reporte.comprasMes)}</dd>
          </div>
          <div className="rounded-2xl bg-surface-sub px-4 py-3 sm:col-span-2">
            <dt className="text-xs font-bold text-muted">Métodos de pago</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {reporte.ventasPorMetodo.length === 0 ? (
                <span className="text-sm text-muted">Sin ventas en este periodo.</span>
              ) : (
                reporte.ventasPorMetodo.map((metodo) => (
                  <span key={metodo.metodo} className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-black text-ink">
                    {metodo.metodo}: {formatMoney(metodo.total)}
                  </span>
                ))
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs font-medium text-muted">
          La ganancia estimada usa ventas menos el costo histórico de los productos vendidos. Si algún producto tiene costo pendiente (0), la ganancia puede estar sobrestimada. Las compras se muestran aparte porque parte del inventario puede seguir disponible.
        </p>
      </section>

      <section className="rounded-[28px] border border-line bg-surface p-6 shadow-[0_28px_70px_-38_rgba(0,0,0,0.95)]">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-muted">Productos más vendidos</h2>
        {reporte.productosMasVendidos.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No hay productos vendidos en este periodo.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {reporte.productosMasVendidos.map((producto, index) => (
              <li key={`${producto.nombre}-${index}`} className="flex items-center justify-between gap-4 rounded-2xl bg-surface-sub px-4 py-3">
                <div>
                  <p className="text-sm font-extrabold text-ink">{index + 1}. {producto.nombre}</p>
                  <p className="text-xs text-muted">{producto.cantidad} unidades · ganancia {formatMoney(producto.ganancia)}</p>
                </div>
                <span className="font-black text-gold">{formatMoney(producto.cobrado)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {reporte.numeroPerdidas > 0 && (
        <section className="rounded-[28px] border border-rose-400/30 bg-rose-400/10 p-6">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-loss">Pérdidas registradas</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink">
            {reporte.perdidasPorMotivo.map((perdida) => (
              <li key={perdida.motivo} className="flex justify-between gap-4">
                <span>{perdida.motivo}</span>
                <strong>{formatMoney(perdida.total)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function ReportesPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [fecha, setFecha] = useState(() => inputDate(new Date()))

  const periodLabel = periodo === 'dia' ? 'Día' : periodo === 'semana' ? 'Semana' : 'Mes'

  return (
    <div className="reportes-pos mx-auto flex h-full w-full max-w-6xl flex-col gap-5 bg-transparent pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Finanzas</p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink sm:text-4xl">Reportes</h1>
          <p className="mt-1 text-sm font-semibold text-muted">Ventas, ganancia estimada, compras y productos más vendidos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-1.5">
          {(['dia', 'semana', 'mes'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriodo(item)}
              className={`rounded-xl px-4 py-2 text-sm font-black ${periodo === item ? 'border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 text-slate-900 shadow-sm' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}
            >
              {item === 'dia' ? 'Día' : item === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-line bg-surface p-3">
        <CalendarDays size={18} className="text-amber-300" aria-hidden="true" />
        <label htmlFor="fecha-reporte" className="text-sm font-bold text-muted">Fecha del {periodLabel.toLowerCase()}</label>
        <input
          id="fecha-reporte"
          type="date"
          max={inputDate(new Date())}
          value={fecha}
          onChange={(event) => setFecha(event.target.value || inputDate(new Date()))}
          className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-sm font-bold text-ink outline-none focus:border-amber-300/70"
        />
        <BarChart3 size={18} className="ml-auto text-gold" aria-hidden="true" />
      </div>

      <ReporteResumen key={`${periodo}-${fecha}`} periodo={periodo} fecha={new Date(`${fecha}T12:00:00`)} />
    </div>
  )
}
