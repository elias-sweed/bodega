import { Check, Tag } from 'lucide-react'

export interface CategoriaSugerida {
  nombre: string
  score: number
}

interface CategoryChipsProps {
  sugerencias: CategoriaSugerida[]
  sugerida?: string | null
  selected: string
  onSelect: (nombre: string) => void
}

export function CategoryChips({
  sugerencias,
  sugerida = null,
  selected,
  onSelect,
}: CategoryChipsProps) {
  const selectedLower = selected.trim().toLowerCase()

  return (
    <div className="flex flex-wrap gap-2">
      {sugerencias.map((categoria) => {
        const activo = categoria.nombre.toLowerCase() === selectedLower
        const esSugerida = sugerida !== null && categoria.nombre === sugerida
        return (
          <button
            key={categoria.nombre}
            type="button"
            onClick={() => onSelect(categoria.nombre)}
            aria-pressed={activo}
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-extrabold tracking-tight transition-colors active:scale-95 ${
              activo
                ? 'border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 text-slate-900 shadow-sm'
                : 'border-line bg-surface-2 text-ink hover:bg-surface-3 hover:text-ink'
            }`}
          >
            {activo ? (
              <Check size={15} strokeWidth={3} aria-hidden="true" />
            ) : (
              <Tag size={14} aria-hidden="true" className="text-muted" />
            )}
            {categoria.nombre}
            {esSugerida && (
              <span
                className={`rounded-lg px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  activo
                    ? 'bg-surface-3 text-ink'
                    : 'border-gold/40 bg-gold/15 text-gold'
                }`}
              >
                {activo ? 'Elegida' : 'Sugerida'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
