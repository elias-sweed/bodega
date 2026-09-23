import { Search } from 'lucide-react'
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
      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted">
        <Search size={22} aria-hidden="true" />
      </span>
      <input
        type="search"
        autoFocus
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Buscar producto o escanear código de barras…"
        enterKeyHint="search"
        className="h-16 w-full rounded-2xl border border-line bg-surface pl-14 pr-6 text-lg font-semibold tracking-tight text-ink shadow-sm outline-none backdrop-blur-2xl transition-all duration-300 placeholder:text-muted/70 hover:bg-surface-2 focus:border-line-strong focus:bg-surface-2"
      />
    </div>
  )
}
