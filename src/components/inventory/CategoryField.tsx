import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { normalizeText, toTitleCase } from '../../utils/format'

interface CategoryFieldProps {
  value: string
  onChange: (value: string) => void
  categories: string[]
  id?: string
  inputClassName?: string
  wrapperClassName?: string
}

const SEARCH_PLACEHOLDER = 'Escribe o busca una categoría…'
const CUSTOM_PLACEHOLDER = 'Escribe una categoría nueva y se creará al guardar'

export function CategoryField({
  value,
  onChange,
  categories,
  id,
  inputClassName,
  wrapperClassName = '',
}: CategoryFieldProps) {
  const [open, setOpen] = useState(false)

  const busqueda = useMemo(() => {
    const query = normalizeText(value)
    if (!query) return categories
    return categories.filter((categoria) => normalizeText(categoria).includes(query))
  }, [categories, value])

  const isCustom =
    value.trim() !== '' &&
    !categories.some((categoria) => normalizeText(categoria) === normalizeText(value))

  return (
    <div className={wrapperClassName}>
      <div className="relative">
        <input
          id={id}
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className={inputClassName}
          placeholder={isCustom ? CUSTOM_PLACEHOLDER : SEARCH_PLACEHOLDER}
        />
        {open && (
          <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-2xl border border-line bg-surface py-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
            {busqueda.length === 0 ? (
              <p className="px-4 py-3 text-sm font-medium text-muted">
                Sin coincidencias. Se creará “{toTitleCase(value)}”.
              </p>
            ) : (
              busqueda.map((categoria) => {
                const activo = normalizeText(categoria) === normalizeText(value)
                return (
                  <button
                    key={categoria}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onChange(categoria)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm font-semibold transition-colors hover:bg-surface-3 ${
                      activo ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    <span className="min-w-0 truncate">{categoria}</span>
                    {activo && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
      {isCustom && (
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-profit">
          <Check size={14} strokeWidth={3} aria-hidden="true" />
          Se creará la nueva categoría “{toTitleCase(value)}”
        </p>
      )}
    </div>
  )
}