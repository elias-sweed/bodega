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
            className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-all active:scale-95 ${
              activo
                ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50'
            }`}
          >
            <span aria-hidden="true">🏷️</span>
            {categoria.nombre}
            {esSugerida && (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase ${
                  activo
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-700'
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