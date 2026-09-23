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
      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-amber-200/80">
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
        className="h-16 w-full rounded-2xl border border-line bg-surface-sub pl-14 pr-6 text-lg font-semibold tracking-tight text-ink shadow-[0_18px_45px_-28px_rgba(0,0,0,0.95)] outline-none placeholder:text-muted focus:border-amber-300/70 focus:bg-surface-2 focus:ring-4 focus:ring-amber-400/10"
      />
    </div>
  )
}
