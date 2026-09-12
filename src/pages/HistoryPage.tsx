import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { AjustesTab } from '../components/history/AjustesTab'
import { ComprasTab } from '../components/history/ComprasTab'
import type { HistoryFilter } from '../components/history/types'
import { VentasTab } from '../components/history/VentasTab'

type TabId = 'ventas' | 'compras' | 'ajustes'
type RangeId = 'todo' | 'hoy' | 'semana' | 'mes'

const TABS: { id: TabId; label: string }[] = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'compras', label: 'Compras' },
  { id: 'ajustes', label: 'Ajustes' },
]

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
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

function rangeToFilter(range: RangeId): { from: Date | null; to: Date | null } {
  const now = new Date()
  switch (range) {
    case 'hoy':
      return { from: startOfDay(now), to: now }
    case 'semana':
      return { from: startOfWeek(now), to: now }
    case 'mes':
      return { from: startOfMonth(now), to: now }
    default:
      return { from: null, to: null }
  }
}

export function HistoryPage() {
  const [tab, setTab] = useState<TabId>('ventas')
  const [range, setRange] = useState<RangeId>('todo')
  const [query, setQuery] = useState('')

  const filter = useMemo<HistoryFilter>(
    () => ({ ...rangeToFilter(range), query }),
    [range, query],
  )

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <header>
        <h1 className="text-2xl font-black text-slate-900">Historial</h1>
        <p className="text-sm text-slate-500">
          Consulta las ventas, compras y ajustes registrados en tu bodega.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex w-max gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={tab === item.id}
              className={`rounded-xl px-5 py-2 text-base font-bold transition-colors ${
                tab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5 rounded-2xl border-2 border-slate-200 bg-white p-1">
            {RANGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setRange(item.id)}
                aria-pressed={range === item.id}
                className={`rounded-xl px-3.5 py-1.5 text-sm font-bold transition-colors ${
                  range === item.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-0 max-w-sm flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border-2 border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400"
              placeholder={
                tab === 'ventas'
                  ? 'Buscar por Nº de ticket…'
                  : tab === 'compras'
                    ? 'Buscar por proveedor, comprobante…'
                    : 'Buscar por producto o motivo…'
              }
            />
          </div>
        </div>
      </div>

      {tab === 'ventas' ? (
        <VentasTab filter={filter} />
      ) : tab === 'compras' ? (
        <ComprasTab filter={filter} />
      ) : (
        <AjustesTab filter={filter} />
      )}
    </div>
  )
}