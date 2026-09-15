import { formatMoney } from '../../utils/format'

interface GastoMesCardProps {
  total: number
}

export function GastoMesCard({ total }: GastoMesCardProps) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">Compras del mes</p>
      <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
        {formatMoney(total)}
      </p>
      <p className="mt-3 text-sm text-slate-400">
        Lo invertido en recibir mercadería este mes.
      </p>
    </section>
  )
}