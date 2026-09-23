import type { Category } from '../../types'

interface CategoryButtonProps {
  category: Category
  onClick: () => void
}

export function CategoryButton({ category, onClick }: CategoryButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-28 flex-col items-center justify-center gap-1.5 rounded-[22px] border border-line bg-surface text-lg font-black tracking-tight text-ink shadow-[0_20px_50px_-30_rgba(0,0,0,0.95)] transition-colors hover:border-amber-300/40 hover:bg-surface-3 active:scale-[0.98]"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-surface-2 text-2xl transition-transform group-hover:scale-110"
        aria-hidden="true"
      >
        {category.emoji}
      </span>
      <span className="px-2 text-center leading-tight">{category.label}</span>
    </button>
  )
}
