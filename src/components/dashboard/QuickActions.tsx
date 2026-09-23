import { Link } from 'react-router-dom'
import { Boxes, ShoppingBag, ShoppingCart, Zap } from 'lucide-react'

const ACCIONES = [
  {
    to: '/caja',
    etiqueta: 'Cobrar',
    detalle: 'Vender ahora',
    Icon: ShoppingCart,
    clases: 'border-emerald-200/30 bg-emerald-400/15 hover:bg-emerald-400/25',
    iconoClases: 'border-profit/30 bg-profit/20 text-profit',
  },
  {
    to: '/compras',
    etiqueta: 'Registrar compra',
    detalle: 'Entró mercadería',
    Icon: ShoppingBag,
    clases: 'border-sky-200/30 bg-sky-400/15 hover:bg-sky-400/25',
    iconoClases: 'border-sky-400/40 bg-sky-400/15 text-sky-200',
  },
  {
    to: '/inventario',
    etiqueta: 'Ver inventario',
    detalle: 'Stock y precios',
    Icon: Boxes,
    clases: 'border-violet-200/30 bg-violet-400/15 hover:bg-violet-400/25',
    iconoClases: 'border-violet-200/30 bg-violet-400/25 text-violet-700',
  },
]

export function QuickActions({ layout = 'grid' }: { layout?: 'grid' | 'stack' }) {
  return (
    <section className="fade-up h-full rounded-[28px] border border-line bg-surface p-5 shadow-sm backdrop-blur-2xl">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-muted">
        <Zap size={15} aria-hidden="true" className="text-gold" />
        Accesos rápidos
      </p>
      <div className={layout === 'stack' ? 'mt-3 flex flex-col gap-2.5' : 'mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3'}>
        {ACCIONES.map((accion) => (
          <Link
            key={accion.to}
            to={accion.to}
            className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ${accion.clases}`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-110 ${accion.iconoClases}`}
            >
              <accion.Icon size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black tracking-tight text-ink">
                {accion.etiqueta}
              </span>
              <span className="block text-xs font-medium text-muted">
                {accion.detalle}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
