import type { ChangeEvent, KeyboardEvent } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onEnter: () => void
}

export function SearchBar({ value, onChange, onEnter }: SearchBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.target.value)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      onEnter()
    }
  }

  return (
    <div className="relative shrink-0">
      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-2xl">
        🔍
      </span>
      <input
        type="search"
        autoFocus
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Buscar producto o escanear código de barras…"
        enterKeyHint="search"
        className="h-16 w-full rounded-2xl border-2 border-slate-200 bg-white pl-14 pr-6 text-xl text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400"
      />
    </div>
  )
}