import { ShoppingBag } from 'lucide-react'
import { formatMoney } from '../../utils/format'
import { HelpTip } from '../common/HelpTip'

interface GastoMesCardProps {
  total: number
}

export function GastoMesCard({ total }: GastoMesCardProps) {
  return (
    <section className="fade-up rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-0.5">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink">
          <ShoppingBag size={16} aria-hidden="true" />
        </span>
        Compras del mes
        <HelpTip
          title="Compras del mes"
          text="Todo lo que has gastado en comprar mercadería este mes. No es ganancia ni pérdida: es lo invertido."
          example="Compraste cajas por S/200 y S/150 este mes: aquí sale S/350."
        />
      </p>
      <p className="mt-4 text-4xl font-black tracking-tighter text-gold ">
        {formatMoney(total)}
      </p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
        Lo invertido en recibir mercadería este mes.
      </p>
    </section>
  )
}
