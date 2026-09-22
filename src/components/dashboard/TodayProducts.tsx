import { useState } from 'react'
import { ChevronDown, PackageSearch } from 'lucide-react'
import { formatMoney } from '../../utils/format'
import type { ProductoHoy } from '../../hooks/useTodayProducts'

interface TodayProductsProps {
  productos: ProductoHoy[]
  loading: boolean
  titulo?: string
  subtitulo?: string
  /** Mensaje cuando no hay ventas en el rango */
  vacio?: string
}

export function TodayProducts({
  productos,
  loading,
  titulo = 'Hoy por producto',
  subtitulo = 'Lo cobrado y lo ganado de cada producto. Toca uno para ver el detalle.',
  vacio = 'Sin ventas hoy todavía. Lo que vendas saldrá aquí por producto.',
}: TodayProductsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const maxCobrado = Math.max(1, ...productos.map((p) => p.cobrado))

  return (
    <section className="fade-up rounded-[28px] border border-white/15 bg-white/[0.07] p-6 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tighter text-white">
            <PackageSearch size={20} aria-hidden="true" className="text-white/80" />
            {titulo}
          </h2>
          <p className="mt-1 text-sm font-medium text-white/60">
            {subtitulo}
          </p>
        </div>
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black text-white/80">
          {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
        </span>
      </div>

      <div className="mt-5">
        {loading && productos.length === 0 ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="skeleton-shimmer h-4 w-1/2 rounded-full" />
                  <div className="skeleton-shimmer mt-2 h-2.5 w-full rounded-full" />
                </div>
                <div className="skeleton-shimmer h-8 w-24 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        ) : productos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/25 bg-white/5 px-5 py-8 text-center text-sm font-semibold text-white/55">
            {vacio}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {productos.map((p) => {
              const expanded = expandedId === p.id
              const margen =
                p.cobrado > 0 ? Math.round((p.ganancia / p.cobrado) * 100) : 0
              return (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl transition-all duration-300 hover:bg-white/15"
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : p.id)}
                    className="flex w-full flex-col gap-2 px-5 py-4 text-left"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-base font-extrabold tracking-tight text-white">
                        {p.nombre}{' '}
                        <span className="text-xs font-bold text-white/55">×{p.cantidad}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-base font-black tabular-nums text-white">
                          {formatMoney(p.cobrado)}
                        </span>
                        <span className="rounded-full border border-emerald-200/40 bg-emerald-400/20 px-2.5 py-0.5 text-xs font-black tabular-nums text-emerald-100">
                          +{formatMoney(p.ganancia)}
                        </span>
                        <ChevronDown
                          size={16}
                          aria-hidden="true"
                          className={`text-white/50 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </span>
                    <span className="flex gap-1.5" aria-hidden="true">
                      <span
                        className="h-2 rounded-full bg-white/50"
                        style={{ width: `${Math.max(5, Math.round((p.cobrado / maxCobrado) * 100))}%` }}
                      />
                      <span
                        className="h-2 rounded-full bg-emerald-300"
                        style={{ width: `${Math.max(p.ganancia > 0 ? 5 : 0, Math.round((p.ganancia / maxCobrado) * 100))}%` }}
                      />
                    </span>
                  </button>

                  {expanded && (
                    <div className="fade-in border-t border-white/10 px-5 py-4">
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium text-white/65">
                            Vendiste {p.cantidad} a {formatMoney(p.precioUnitario)} cada uno
                          </span>
                          <span className="font-black tabular-nums text-white">
                            {formatMoney(p.cobrado)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium text-white/65">
                            A ti te habían costado
                          </span>
                          <span className="font-bold tabular-nums text-white/75">
                            − {formatMoney(p.costoTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-2">
                          <span className="font-black text-white">
                            Te quedaron ({margen}% de lo cobrado)
                          </span>
                          <span className="text-base font-black tabular-nums text-emerald-200">
                            {formatMoney(p.ganancia)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
