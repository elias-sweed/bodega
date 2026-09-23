import { useMemo, useState } from 'react'
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useReporteMensual } from '../hooks/useReporteMensual'
import { formatMoney } from '../utils/format'
import { exportExcel } from '../utils/exportExcel'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function mesClaveActual(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

function capitalizar(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function etiquetaMes(y: number, m: number): string {
  const nombreMes = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(
    new Date(y, m - 1, 1),
  )
  return `${capitalizar(nombreMes)} ${y}`
}

/** Formato de un concepto que se resta en el desglose */
function mostrarResta(valor: number): string {
  return valor !== 0 ? `−${formatMoney(Math.abs(valor))}` : formatMoney(0)
}

function Fila({
  etiqueta,
  valor,
  signo,
  negrita,
}: {
  etiqueta: string
  valor: string
  signo?: '+' | '−' | '='
  negrita?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-sub px-4 py-3">
      <span className="flex items-center gap-2 text-sm font-bold text-ink">
        {signo && (
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
              signo === '−'
                ? 'bg-rose-100 text-rose-700'
                : signo === '='
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-sky-100 text-sky-700'
            }`}
          >
            {signo}
          </span>
        )}
        {etiqueta}
      </span>
      <span
        className={`tabular-nums ${
          negrita ? 'text-base font-black tracking-tight' : 'text-sm font-extrabold'
        }`}
      >
        {valor}
      </span>
    </div>
  )
}

export function ReportesPage() {
  const [mes, setMes] = useState(mesClaveActual)
  const hoy = useMemo(() => mesClaveActual(), [])

  const { y, m } = useMemo(() => {
    const [anio, mesNum] = mes.split('-').map(Number)
    return { y: anio, m: mesNum }
  }, [mes])
  const etiqueta = useMemo(() => etiquetaMes(y, m), [y, m])

  const cambiarMes = (delta: 1 | -1): void => {
    setMes((prev) => {
      const [anio, mesNum] = prev.split('-').map(Number)
      const fecha = new Date(anio, mesNum - 1 + delta, 1)
      return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}`
    })
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Finanzas
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink sm:text-4xl">
            Reportes
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-muted">
            Utilidad Neta del mes de {etiqueta}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-sm backdrop-blur-2xl">
          <button
            type="button"
            onClick={() => cambiarMes(-1)}
            aria-label="Mes anterior"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-all duration-200 hover:bg-surface-3 active:scale-95"
          >
            <ChevronLeft size={17} aria-hidden="true" />
          </button>
          <input
            type="month"
            value={mes}
            max={hoy}
            onChange={(e) => {
              if (e.target.value) setMes(e.target.value)
            }}
            aria-label="Seleccionar mes"
            className="h-9 rounded-xl px-2 text-sm font-black tabular-nums text-ink outline-none focus:border-line-strong"
          />
          <button
            type="button"
            onClick={() => cambiarMes(1)}
            disabled={mes >= hoy}
            aria-label="Mes siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-all duration-200 hover:bg-surface-3 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      <ReporteResumen key={mes} mes={mes} />
    </div>
  )
}

function ReporteResumen({ mes }: { mes: string }) {
  const { y, m } = useMemo(() => {
    const [anio, mesNum] = mes.split('-').map(Number)
    return { y: anio, m: mesNum }
  }, [mes])

  const desde = useMemo(() => new Date(y, m - 1, 1), [y, m])
  const hasta = useMemo(() => new Date(y, m, 1), [y, m])
  const etiqueta = useMemo(() => etiquetaMes(y, m), [y, m])

  const { reporte, loading, error, refresh } = useReporteMensual(desde, hasta)

  const handleExportar = (): void => {
    const numero = (n: number): number => Number(n.toFixed(2))
    const rows: (string | number)[][] = [
      [`Reporte Financiero — ${etiqueta}`],
      [],
      ['Concepto', 'Importe'],
      ['Total Ventas Cobradas', numero(reporte.totalVentas)],
      ...reporte.ventasPorMetodo.map((venta) => [
        `  Ventas ${venta.metodo}`,
        numero(venta.total),
      ]),
      ['Costo de Ventas (COGS)', -numero(reporte.cogs)],
      ['Ganancia Bruta de Ventas', numero(reporte.gananciaBruta)],
      ['Compras del Mes', -numero(reporte.comprasMes)],
      ['Pérdidas por Mermas y Consumo', -numero(reporte.perdidasTotales)],
      [],
      ['GANANCIA LÍQUIDA REAL (Utilidad Neta)', numero(reporte.gananciaLiquida)],
      [],
      ['Pérdidas del Mes por Motivo'],
      ['Motivo', 'Importe'],
      ...reporte.perdidasPorMotivo.map((perdida) => [
        perdida.motivo,
        -numero(perdida.total),
      ]),
    ]
    exportExcel(rows, `reporte-financiero-${mes}.xlsx`, `Reporte ${etiqueta}`)
  }

  const handleImprimir = (): void => {
    const ventana = window.open('', '_blank', 'width=820,height=920')
    if (!ventana) return

    const fila = (etiquetaFila: string, valor: string, clase = ''): string =>
      `<tr${clase ? ` class="${clase}"` : ''}><td>${etiquetaFila}</td><td class="num">${valor}</td></tr>`
    const metodoRows = reporte.ventasPorMetodo
      .map((venta) => fila(`Ventas ${venta.metodo}`, formatMoney(venta.total), 'sub'))
      .join('')
    const perdidaRows =
      reporte.perdidasPorMotivo.length > 0
        ? reporte.perdidasPorMotivo
            .map((perdida) =>
              fila(perdida.motivo, formatMoney(perdida.total), 'sub'),
            )
            .join('')
        : '<tr class="sub"><td>Sin mermas ni consumos este mes</td><td class="num">S/ 0.00</td></tr>'

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte financiero — ${etiqueta}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; padding: 32px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .sub { color: #475569; font-size: 18px; }
  h2 { margin: 28px 0 10px; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #64748b; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { border-top: 2px solid #059669; border-bottom: none; font-weight: 800; color: #047857; font-size: 16px; }
  tr.detalle td { font-weight: 700; }
  .encabezado { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 4px; }
  .pie { margin-top: 28px; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="encabezado">
    <h1>Reporte financiero — ${etiqueta}</h1>
    <p>Bodega POS · Utilidad del mes</p>
  </div>
  <h2>Desglose del mes</h2>
  <table>
    ${fila('Total Ventas Cobradas', formatMoney(reporte.totalVentas), 'detalle')}
    ${metodoRows}
    ${fila('Costo de Ventas (COGS)', mostrarResta(reporte.cogs), 'sub')}
    ${fila('Ganancia Bruta de Ventas', formatMoney(reporte.gananciaBruta), 'detalle')}
    ${fila('Compras del Mes', mostrarResta(reporte.comprasMes), 'sub')}
    ${fila('Pérdidas por Mermas y Consumo', mostrarResta(reporte.perdidasTotales), 'sub')}
    ${fila('GANANCIA LÍQUIDA REAL (Utilidad Neta)', formatMoney(reporte.gananciaLiquida), 'total')}
  </table>
  <h2>Pérdidas del mes por motivo</h2>
  <table>
    ${perdidaRows}
  </table>
  <p class="pie">Generado el ${new Date().toLocaleString('es-PE')}</p>
</body>
</html>`

    ventana.document.write(html)
    ventana.document.close()
    ventana.focus()
    try {
      ventana.onafterprint = () => ventana.close()
    } catch {
      // algunos navegadores bloquean el cierre automático
    }
    window.setTimeout(() => ventana.print(), 120)
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-rose-200 bg-rose-100 p-8 text-center shadow-sm backdrop-blur-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-200/60 text-rose-700">
          <BarChart3 size={22} aria-hidden="true" />
        </span>
        <p className="text-lg font-extrabold tracking-tight text-ink">
          No se pudo cargar el reporte
        </p>
        <p className="text-sm font-medium text-muted">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-rose-700 shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
        >
          <RotateCcw size={15} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-[28px] border border-line bg-surface" />
        <div className="h-72 animate-pulse rounded-[28px] border border-line bg-surface" />
      </div>
    )
  }

  return (
    <div className="fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleExportar}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-extrabold text-ink shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0 active:scale-[0.98]"
        >
          <Download size={16} aria-hidden="true" />
          Exportar Excel
        </button>
        <button
          type="button"
          onClick={handleImprimir}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-extrabold text-emerald-800 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-100 active:translate-y-0 active:scale-[0.98]"
        >
          <Printer size={16} aria-hidden="true" />
          Imprimir
        </button>
      </div>

      <section className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm backdrop-blur-2xl sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
              Ganancia Líquida Libre · Utilidad Neta
            </p>
            <p className="mt-1 max-w-md text-sm font-semibold text-emerald-800/80">
              Lo que queda de las ventas del mes después de cubrir compras y
              pérdidas por mermas y consumo.
            </p>
            <p
              className={`mt-3 text-4xl font-black tracking-tighter tabular-nums sm:text-5xl ${
                reporte.gananciaLiquida >= 0 ? 'text-emerald-700' : 'text-loss'
              }`}
            >
              {formatMoney(reporte.gananciaLiquida)}
            </p>
          </div>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 shadow-sm">
            {reporte.gananciaLiquida >= 0 ? (
              <TrendingUp size={30} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <TrendingDown size={30} strokeWidth={2.5} aria-hidden="true" />
            )}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
            {reporte.numeroVentas} {reporte.numeroVentas === 1 ? 'venta' : 'ventas'}
          </span>
          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
            {reporte.numeroComprasMes} compras
          </span>
          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
            {reporte.numeroPerdidas} mermas
          </span>
        </div>
      </section>

      <section className="rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-muted">
          Desglose del mes · {etiqueta}
        </h2>

        <div className="mt-4 space-y-2.5">
          <Fila
            signo="+"
            etiqueta="Total Ventas Cobradas"
            valor={formatMoney(reporte.totalVentas)}
            negrita
          />
          {reporte.ventasPorMetodo.map((venta) => (
            <div
              key={venta.metodo}
              className="flex items-center justify-between gap-4 py-0.5 pl-12 text-sm"
            >
              <span className="font-bold text-muted">Ventas {venta.metodo}</span>
              <span className="font-semibold tabular-nums text-ink">
                {formatMoney(venta.total)}
              </span>
            </div>
          ))}

          <div className="pt-2">
            <Fila
              signo="−"
              etiqueta="Costo de Ventas (COGS)"
              valor={mostrarResta(reporte.cogs)}
            />
          </div>
          <Fila
            signo="="
            etiqueta="Ganancia Bruta de Ventas"
            valor={formatMoney(reporte.gananciaBruta)}
            negrita
          />
          <Fila
            signo="−"
            etiqueta="Compras del Mes (reabastecimiento)"
            valor={mostrarResta(reporte.comprasMes)}
          />
          <Fila
            signo="−"
            etiqueta="Pérdidas por Mermas y Consumo"
            valor={mostrarResta(reporte.perdidasTotales)}
          />

          <div className="border-t border-line pt-3">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <span className="text-sm font-black uppercase tracking-wide text-emerald-800">
                GANANCIA LÍQUIDA REAL
              </span>
              <span
                className={`text-xl font-black tracking-tighter tabular-nums ${
                  reporte.gananciaLiquida >= 0 ? 'text-emerald-700' : 'text-loss'
                }`}
              >
                {formatMoney(reporte.gananciaLiquida)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.18em] text-muted">
          Pérdidas del Mes por Motivo
        </h2>
        {reporte.perdidasPorMotivo.length === 0 ? (
          <div className="mt-4 flex flex-col items-start gap-2 rounded-2xl bg-surface-sub px-4 py-4">
            <p className="text-sm font-bold text-ink">Sin pérdidas este mes</p>
            <p className="text-sm font-medium text-muted">
              No hubo registros de consumo interno, vencidos o dañados en {etiqueta}.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {reporte.perdidasPorMotivo.map((perdida) => (
              <li
                key={perdida.motivo}
                className="flex items-center justify-between gap-4 rounded-2xl bg-surface-sub px-4 py-3"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-ink">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-100 text-rose-700">
                    <span className="text-xs font-black">−</span>
                  </span>
                  {perdida.motivo}
                  <span className="text-xs font-semibold text-muted">
                    {perdida.numero} {perdida.numero === 1 ? 'registro' : 'registros'}
                  </span>
                </span>
                <span className="text-sm font-black tabular-nums text-loss">
                  {formatMoney(perdida.total)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}