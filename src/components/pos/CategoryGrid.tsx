import type { Category } from '../../types'
import { HelpTip } from '../common/HelpTip'
import { CategoryButton } from './CategoryButton'

interface CategoryGridProps {
  categories: Category[]
  onSelect: (category: Category) => void
}

export function CategoryGrid({ categories, onSelect }: CategoryGridProps) {
  return (
    <section className="fade-in">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.18em] text-muted">
        Categorías
        <HelpTip
          title="Categorías"
          text="Toca una categoría (Bebidas, Abarrotes…) para ver solo esos productos. Así no buscas uno por uno."
          example="Si el cliente pide una gaseosa, toca 'Bebidas' y aparecen las bebidas directo."
        />
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
