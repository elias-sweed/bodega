import { useState } from 'react'
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
  const [tab, setTab] = useState<TabId>('resumen')

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

      <div className="flex w-max max-w-full shrink-0 gap-2 overflow-x-auto rounded-[20px] border border-line bg-surface p-1.5 backdrop-blur-2xl">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
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

      <div key={tab} className="fade-in">
        {tab === 'resumen' ? <ReportesPage /> : <HistoryPage />}
      </div>
    </div>
  )
}
