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
      className={`flex h-28 flex-col items-center justify-center gap-1 rounded-3xl text-2xl font-bold shadow-sm transition-all hover:shadow-md active:scale-95 ${category.className}`}
    >
      <span className="text-4xl" aria-hidden="true">
        {category.emoji}
      </span>
      <span>{category.label}</span>
    </button>
  )
}