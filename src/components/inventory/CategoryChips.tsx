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
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-extrabold tracking-tight backdrop-blur-xl transition-all duration-300 active:scale-95 ${
              activo
                ? 'border-emerald-200/50 bg-gradient-to-br from-emerald-400/80 to-emerald-600/80 text-white shadow-[0_12px_30px_-12px_rgba(16,185,129,0.8)]'
                : 'border-white/20 bg-white/10 text-white/80 hover:-translate-y-0.5 hover:bg-white/20 hover:text-white'
            }`}
          >
            {activo ? (
              <Check size={15} strokeWidth={3} aria-hidden="true" />
            ) : (
              <Tag size={14} aria-hidden="true" className="text-white/50" />
            )}
            {categoria.nombre}
            {esSugerida && (
              <span
                className={`rounded-lg px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  activo
                    ? 'bg-white/25 text-white'
                    : 'border border-amber-200/30 bg-amber-400/20 text-amber-100'
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
