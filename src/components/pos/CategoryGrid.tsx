import type { Category } from '../../types'
import { CategoryButton } from './CategoryButton'

interface CategoryGridProps {
  categories: Category[]
  onSelect: (category: Category) => void
}

export function CategoryGrid({ categories, onSelect }: CategoryGridProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-slate-700">Categorías</h2>
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