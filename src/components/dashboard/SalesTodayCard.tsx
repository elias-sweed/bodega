import { formatMoney } from '../../utils/format'

interface SalesTodayCardProps {
  resumen: {
    ventas_hoy_total: number
    ventas_hoy_count: number
    efectivo_hoy: number
    yape_hoy: number
    plin_hoy: number
    ganancia_estimada_hoy: number
  }
}

export function SalesTodayCard({ resumen }: SalesTodayCardProps) {
  const metodos = [
    { label: 'Efectivo', total: resumen.efectivo_hoy },
    { label: 'Yape', total: resumen.yape_hoy },
    { label: 'Plin', total: resumen.plin_hoy },
  ].filter((metodo) => metodo.total > 0)

  return (
    <section className="rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-8 text-white shadow-lg">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xl font-semibold text-sky-100">Ventas de Hoy</p>
          <p className="mt-2 text-6xl font-black tracking-tight">
            {formatMoney(resumen.ventas_hoy_total)}
          </p>
          <p className="mt-2 text-base text-sky-100">
            {resumen.ventas_hoy_count}{' '}
            {resumen.ventas_hoy_count === 1 ? 'venta registrada' : 'ventas registradas'}
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur-sm">
          <p className="text-sm font-semibold text-sky-100">Ganancia estimada</p>
          <p className="text-2xl font-black">{formatMoney(resumen.ganancia_estimada_hoy)}</p>
        </div>
      </div>

      {metodos.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {metodos.map((metodo) => (
            <div
              key={metodo.label}
              className="rounded-2xl bg-white/10 px-4 py-2 backdrop-blur-sm"
            >
              <span className="text-sm font-semibold text-sky-100">{metodo.label}</span>
              <span className="ml-2 text-lg font-bold">{formatMoney(metodo.total)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}