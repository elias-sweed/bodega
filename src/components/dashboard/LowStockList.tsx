import { CheckCircle2, TriangleAlert } from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'

interface LowStockListProps {
  products: ProductosRow[]
}

export function LowStockList({ products }: LowStockListProps) {
  if (products.length === 0) {
    return (
      <div className="flex items-center gap-4 rounded-[28px] border border-emerald-200/30 bg-emerald-400/15 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/25 text-emerald-100">
          <CheckCircle2 size={22} aria-hidden="true" />
        </span>
        <div>
          <p className="text-lg font-black tracking-tight text-ink">Todo en orden</p>
          <p className="text-sm font-medium text-muted">
            Ningún producto por agotarse por ahora.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {products.map((product) => {
        const agotado = product.stock_actual <= 0
        return (
          <li
            key={product.id}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-2"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  agotado
                    ? 'border-rose-200/30 bg-rose-400/20 text-rose-100'
                    : 'border-amber-200/30 bg-amber-400/20 text-amber-100'
                }`}
              >
                <TriangleAlert size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-extrabold tracking-tight text-ink">
                  {product.nombre}
                </p>
                <p className="truncate text-xs font-semibold uppercase tracking-widest text-muted">
                  {product.categoria}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider ${
                  agotado
                    ? 'border-rose-200/30 bg-rose-400/25 text-rose-50'
                    : 'border-amber-200/30 bg-amber-400/25 text-amber-50'
                }`}
              >
                {agotado ? 'Agotado' : 'Por agotarse'}
              </span>
              <p className="mt-1.5 text-xs font-bold text-muted">
                {product.stock_actual} en bodega · mín {product.stock_minimo}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
