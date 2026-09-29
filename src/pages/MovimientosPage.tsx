import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, History } from 'lucide-react'
import { ReportesPage } from './ReportesPage'
import { HistoryPage } from './HistoryPage'
import { MovimientosWelcomeModal } from '../components/movimientos/MovimientosWelcomeModal'

type TabId = 'resumen' | 'detalle'

const TABS: { id: TabId; label: string; descripcion: string; Icon: typeof BarChart3 }[] = [
  {
    id: 'resumen',
    label: 'Resumen',
    descripcion: '¿Cuánto gané?',
    Icon: BarChart3,
  },
  {
    id: 'detalle',
    label: 'Detalle',
    descripcion: '¿Qué vendí o compré?',
    Icon: History,
  },
]

export function MovimientosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TabId = searchParams.get('tab') === 'detalle' ? 'detalle' : 'resumen'
  const [visitadas, setVisitadas] = useState<Record<TabId, boolean>>(() => ({
    resumen: tab === 'resumen',
    detalle: tab === 'detalle',
  }))
  const botones = useRef<(HTMLButtonElement | null)[]>([])

  // La pestaña vive en la dirección para que se pueda recargar, compartir y
  // marcar; una vez abierta se queda montada para no perder filtros ni repetir
  // la consulta al volver a ella.
  const mostrar = (id: TabId): void => {
    setSearchParams({ tab: id }, { replace: true })
    setVisitadas((previo) => (previo[id] ? previo : { ...previo, [id]: true }))
  }

  const mover = (indice: number): void => {
    const total = TABS.length
    const destino = ((indice % total) + total) % total
    mostrar(TABS[destino].id)
    botones.current[destino]?.focus()
  }

  const alTeclado = (evento: KeyboardEvent<HTMLDivElement>): void => {
    const actual = TABS.findIndex((item) => item.id === tab)
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
      evento.preventDefault()
      mover(actual + 1)
    } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      mover(actual - 1)
    } else if (evento.key === 'Home') {
      evento.preventDefault()
      mover(0)
    } else if (evento.key === 'End') {
      evento.preventDefault()
      mover(TABS.length - 1)
    }
  }

  return (
    <div className="movimientos-pos mx-auto flex h-full w-full max-w-6xl flex-col gap-5 bg-transparent pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Movimientos
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink sm:text-4xl">
            ¿Qué pasó en la bodega?
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            Mira tus ganancias o busca ventas y compras específicas.
          </p>
        </div>
        <MovimientosWelcomeModal />
      </header>

      <div
        role="tablist"
        aria-label="Ver el resumen o el detalle de los movimientos"
        onKeyDown={alTeclado}
        className="flex w-max max-w-full shrink-0 gap-2 overflow-x-auto rounded-[20px] border border-line bg-surface p-1.5 backdrop-blur-2xl"
      >
        {TABS.map((item, indice) => (
          <button
            key={item.id}
            ref={(elemento) => {
              botones.current[indice] = elemento
            }}
            id={`movimientos-tab-${item.id}`}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            aria-controls={`movimientos-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => mostrar(item.id)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-black tracking-tight transition-all duration-300 active:scale-95 ${
              tab === item.id
                ? 'border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 text-slate-900 shadow-md'
                : 'text-muted hover:bg-surface hover:text-ink'
            }`}
          >
            <item.Icon size={16} aria-hidden="true" />
            {item.label}
            <span
              className={`text-xs font-bold ${
                tab === item.id ? 'text-slate-700' : 'text-muted'
              }`}
            >
              {item.descripcion}
            </span>
          </button>
        ))}
      </div>

      {visitadas.resumen && (
        <div
          id="movimientos-panel-resumen"
          role="tabpanel"
          aria-labelledby="movimientos-tab-resumen"
          hidden={tab !== 'resumen'}
          className="fade-in"
        >
          <ReportesPage mostrarEncabezado={false} />
        </div>
      )}

      {visitadas.detalle && (
        <div
          id="movimientos-panel-detalle"
          role="tabpanel"
          aria-labelledby="movimientos-tab-detalle"
          hidden={tab !== 'detalle'}
          className="fade-in"
        >
          <HistoryPage mostrarEncabezado={false} />
        </div>
      )}
    </div>
  )
}
