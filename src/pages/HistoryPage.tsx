import { useState } from 'react'
import { ComprasTab } from '../components/history/ComprasTab'
import { VentasTab } from '../components/history/VentasTab'

type TabId = 'ventas' | 'compras'

const TABS: { id: TabId; label: string }[] = [
  { id: 'ventas', label: 'Ventas' },
  { id: 'compras', label: 'Compras' },
]

export function HistoryPage() {
  const [tab, setTab] = useState<TabId>('ventas')

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto">
      <header>
        <h1 className="text-2xl font-black text-slate-900">Historial</h1>
        <p className="text-sm text-slate-500">
          Consulta las ventas y compras registradas en tu bodega.
        </p>
      </header>

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

      {tab === 'ventas' ? <VentasTab /> : <ComprasTab />}
    </div>
  )
}