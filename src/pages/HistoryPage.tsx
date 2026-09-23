import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Moon,
  Search,
  Sun,
  Sunrise,
  Sunset,
  Upload,
  X,
} from 'lucide-react'
import { AjustesTab } from '../components/history/AjustesTab'
import { ComprasTab } from '../components/history/ComprasTab'
import type { HistoryFilter } from '../components/history/types'
import { VentasTab } from '../components/history/VentasTab'
import { ImportVentasModal } from '../components/import/ImportVentasModal'
import type { FranjaId } from '../utils/format'

type TabId = 'ventas' | 'compras' | 'ajustes'
type RangeId = 'todo' | 'hoy' | 'ayer' | 'semana' | 'mes' | 'dia'

const TABS: { id: TabId; label: string }[] = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'compras', label: 'Compras' },
  { id: 'ajustes', label: 'Correcciones' },
]

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
]

const FRANJAS: { id: FranjaId; label: string; hint: string; Icon: typeof Sun }[] = [
  { id: 'todo', label: 'Todo el día', hint: '', Icon: Sun },
  { id: 'manana', label: 'Mañana', hint: '6am–12pm', Icon: Sunrise },
  { id: 'tarde', label: 'Tarde', hint: '12–7pm', Icon: Sunset },
  { id: 'noche', label: 'Noche', hint: '7pm–6am', Icon: Moon },
]

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = startOfDay(date)
  start.setDate(start.getDate() + diff)
  return start
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function toInputDate(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function rangeToFilter(
  range: RangeId,
  customDate: string,
): { from: Date | null; to: Date | null } {
  const now = new Date()
  const today = startOfDay(now)
  switch (range) {
    case 'hoy':
      return { from: today, to: now }
    case 'ayer': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return { from: yesterday, to: today }
    }
    case 'semana':
      return { from: startOfWeek(now), to: now }
    case 'mes':
      return { from: startOfMonth(now), to: now }
    case 'dia': {
      if (!customDate) return { from: null, to: null }
      const [y, m, d] = customDate.split('-').map(Number)
      if (!y || !m || !d) return { from: null, to: null }
      const from = new Date(y, m - 1, d)
      const to = new Date(y, m - 1, d + 1)
      return { from, to }
    }
    default:
      return { from: null, to: null }
  }
}

export function HistoryPage() {
  const [tab, setTab] = useState<TabId>('ventas')
  const [range, setRange] = useState<RangeId>('todo')
  const [customDate, setCustomDate] = useState(() => toInputDate(new Date()))
  const [franja, setFranja] = useState<FranjaId>('todo')
  const [query, setQuery] = useState('')
  const [showImport, setShowImport] = useState(false)

  const filter = useMemo<HistoryFilter>(
    () => ({ ...rangeToFilter(range, customDate), query, franja }),
    [range, customDate, query, franja],
  )

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-5 overflow-y-auto px-4 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Registro
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tighter text-ink  sm:text-4xl">
            Historial
          </h1>
          <p className="mt-1 text-sm font-medium text-muted">
            Qué vendiste y qué compraste, por día y por horario.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 text-sm font-extrabold text-ink shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0 active:scale-[0.98]"
        >
          <Upload size={16} aria-hidden="true" />
          Importar Excel
        </button>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex w-max max-w-full gap-2 overflow-x-auto rounded-[20px] border border-line bg-surface p-1.5 backdrop-blur-2xl">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`rounded-xl px-5 py-2 text-base font-black tracking-tight transition-all duration-300 active:scale-95 ${
                tab === item.id
                  ? 'bg-white text-[#2a1568] shadow'
                  : 'text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 backdrop-blur-2xl">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRange(item.id)}
                aria-pressed={range === item.id}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-extrabold transition-all duration-300 active:scale-95 ${
                  range === item.id
                    ? 'border border-line-strong bg-surface-3 text-ink shadow'
                    : 'border border-transparent text-muted hover:bg-surface hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
            <span
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold transition-all duration-300 ${
                range === 'dia'
                  ? 'border border-line-strong bg-surface-3 text-ink shadow'
                  : 'border border-dashed border-line-strong text-muted'
              }`}
              title="Elige cualquier día del calendario: Hoy y Ayer son atajos de esto"
            >
              <CalendarDays size={15} aria-hidden="true" />
              <input
                type="date"
                value={customDate}
                max={toInputDate(new Date())}
                onChange={(e) => {
                  setCustomDate(e.target.value)
                  if (e.target.value) setRange('dia')
                }}
                aria-label="Elegir cualquier día del calendario"
                className="w-28 bg-transparent text-sm font-extrabold text-ink outline-none [color-scheme:light]"
              />
            </span>
          </div>

          <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-2xl border border-line bg-surface p-1.5 backdrop-blur-2xl">
            {FRANJAS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFranja(item.id)}
                aria-pressed={franja === item.id}
                title={item.hint || 'Sin filtro de horario'}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all duration-300 active:scale-95 ${
                  franja === item.id
                    ? 'border border-amber-200 bg-amber-100 text-amber-700 shadow'
                    : 'border border-transparent text-muted hover:bg-surface hover:text-ink'
                }`}
              >
                <item.Icon size={14} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>

          <div className="w-full">
            <label
              htmlFor="historial-busqueda"
              className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-muted"
            >
              <Search size={13} aria-hidden="true" />
              Búsqueda por fecha, número o palabra
            </label>
            <div className="relative w-full">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 shrink-0 text-muted"
              aria-hidden="true"
            />
            <input
              id="historial-busqueda"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border border-line bg-surface pl-12 pr-4 text-base font-semibold text-ink outline-none backdrop-blur-2xl transition-all duration-300 placeholder:text-muted/70 hover:bg-surface-2 focus:border-line-strong focus:bg-surface-2"
              placeholder={
                tab === 'ventas'
                  ? 'Ej. 12/05/2026, 5, ticket…'
                  : tab === 'compras'
                    ? 'Ej. 12/05/2026, proveedor, boleta…'
                    : 'Ej. producto, motivo…'
              }
            />
            </div>
          </div>
        </div>

        {(range !== 'todo' || franja !== 'todo') && (
          <div className="fade-in flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-2 px-4 py-3 shadow-sm backdrop-blur-2xl">
            <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-muted">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 text-ink">
                <CalendarDays size={16} aria-hidden="true" />
              </span>
              <span>
                Estás viendo:{' '}
                <span className="font-black text-ink">
                  {range === 'todo'
                    ? 'todo'
                    : range === 'hoy'
                      ? 'hoy'
                      : range === 'ayer'
                        ? 'ayer'
                        : range === 'semana'
                          ? 'esta semana'
                          : range === 'mes'
                            ? 'este mes'
                            : customDate.split('-').reverse().join('/')}
                </span>
                {franja !== 'todo' && (
                  <span className="font-black text-ink">
                    {' '}
                    · {franja === 'manana' ? 'en la mañana (6am–12pm)' : franja === 'tarde' ? 'en la tarde (12–7pm)' : 'en la noche (7pm–6am)'}
                  </span>
                )}
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                setRange('todo')
                setFranja('todo')
              }}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border-2 border-rose-300/50 bg-rose-500/25 px-4 text-sm font-black tracking-tight text-ink shadow-sm backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-200/70 hover:bg-rose-500/40 active:translate-y-0 active:scale-95"
            >
              <X size={17} strokeWidth={3} aria-hidden="true" />
              Quitar filtros
            </button>
          </div>
        )}
      </div>

      <div key={tab} className="fade-in">
        {tab === 'ventas' ? (
          <VentasTab filter={filter} />
        ) : tab === 'compras' ? (
          <ComprasTab filter={filter} />
        ) : (
          <AjustesTab filter={filter} />
        )}
      </div>

      {showImport && <ImportVentasModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
