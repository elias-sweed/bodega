import { formatMoney } from '../../utils/format'

interface SalesTodayCardProps {
  total: number
}

export function SalesTodayCard({ total }: SalesTodayCardProps) {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-sky-500 to-indigo-600 p-8 text-white shadow-lg">
      <p className="text-xl font-semibold text-sky-100">
        Ventas de Hoy
      </p>
      <p className="mt-2 text-6xl font-black tracking-tight">
        {formatMoney(total)}
      </p>
      <p className="mt-4 text-base text-sky-100">
        Sigue así, cada venta cuenta.
      </p>
    </section>
  )
}