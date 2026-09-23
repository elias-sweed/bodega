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
      className="group flex h-28 flex-col items-center justify-center gap-1.5 rounded-[22px] border border-line bg-surface text-lg font-black tracking-tight text-ink shadow-sm backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-surface-3 hover:shadow-sm active:translate-y-0 active:scale-[0.98]"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-surface-2 text-2xl transition-transform duration-300 group-hover:scale-110"
        aria-hidden="true"
      >
        {category.emoji}
      </span>
      <span className="px-2 text-center leading-tight">{category.label}</span>
    </button>
  )
}
