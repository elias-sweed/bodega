import { PieChart } from 'lucide-react'
import { formatMoney } from '../../utils/format'

interface MetodoDonutProps {
  efectivo: number
  yape: number
  plin: number
}

const SEGMENTOS = [
  { clave: 'efectivo', etiqueta: 'Efectivo', color: '#34d399' },
  { clave: 'yape', etiqueta: 'Yape', color: '#38bdf8' },
  { clave: 'plin', etiqueta: 'Plin', color: '#c084fc' },
] as const

export function MetodoDonut({ efectivo, yape, plin }: MetodoDonutProps) {
  const valores = { efectivo, yape, plin }
  const total = efectivo + yape + plin
  const RADIO = 52
  const CIRC = 2 * Math.PI * RADIO

  let acumulado = 0
  const arcos = SEGMENTOS.map((seg) => {
    const fraccion = total > 0 ? valores[seg.clave] / total : 0
    const arco = { ...seg, fraccion, offset: acumulado }
    acumulado += fraccion
    return arco
  })

  return (
    <section className="fade-up flex h-full flex-col rounded-[28px] border border-white/20 bg-white/10 p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">
        <PieChart size={16} aria-hidden="true" className="text-white/80" />
        Hoy por método de pago
      </p>

      {total <= 0 ? (
        <p className="flex flex-1 items-center justify-center py-8 text-center text-sm font-medium text-white/55">
          Sin cobros hoy. Al vender, aquí verás cómo te pagaron.
        </p>
      ) : (
        <div className="mt-4 flex flex-1 flex-wrap items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
              <circle cx="64" cy="64" r={RADIO} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="16" />
              {arcos.map(
                (arco) =>
                  arco.fraccion > 0 && (
                    <circle
                      key={arco.clave}
                      cx="64"
                      cy="64"
                      r={RADIO}
                      fill="none"
                      stroke={arco.color}
                      strokeWidth="16"
                      strokeLinecap="butt"
                      strokeDasharray={`${arco.fraccion * CIRC} ${CIRC}`}
                      strokeDashoffset={-arco.offset * CIRC}
                    />
                  ),
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black tracking-tight text-white">
                {formatMoney(total)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                Hoy
              </span>
            </div>
          </div>

          <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
            {arcos.map((arco) => (
              <li key={arco.clave} className="flex items-center gap-2.5">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: arco.color }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white/75">
                  {arco.etiqueta}
                  <span className="ml-1.5 font-black tabular-nums text-white/45">
                    {Math.round(arco.fraccion * 100)}%
                  </span>
                </span>
                <span className="shrink-0 text-sm font-black tabular-nums text-white">
                  {formatMoney(valores[arco.clave])}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
