import type { Category } from '../../types'
import { CategoryButton } from './CategoryButton'

interface CategoryGridProps {
  categories: Category[]
  onSelect: (category: Category) => void
}

export function CategoryGrid({ categories, onSelect }: CategoryGridProps) {
  return (
    <section className="fade-in">
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-[0.18em] text-muted">
        Categorías
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            category={category}
            onClick={() => onSelect(category)}
          />
        ))}
      </div>
    </section>
  )
}
