import type { Category } from '../types'
import type { ProductosRow } from '../types/database.types'

const CATEGORY_EMOJIS: Record<string, string> = {
  Desayuno: '🥐',
  Impresiones: '🖨️',
  Snacks: '🍿',
  Bebidas: '🥤',
  Dulces: '🍬',
  Farmacia: '💊',
}

const PASTEL_COLORS = [
  'bg-amber-100 text-amber-900 hover:bg-amber-200',
  'bg-blue-100 text-blue-900 hover:bg-blue-200',
  'bg-orange-100 text-orange-900 hover:bg-orange-200',
  'bg-cyan-100 text-cyan-900 hover:bg-cyan-200',
  'bg-rose-100 text-rose-900 hover:bg-rose-200',
  'bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
  'bg-violet-100 text-violet-900 hover:bg-violet-200',
  'bg-lime-100 text-lime-900 hover:bg-lime-200',
]

export function deriveCategories(products: ProductosRow[]): Category[] {
  const names = [
    ...new Set(
      products
        .map((product) => product.categoria)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'))

  return names.map((name, index) => ({
    id: name,
    label: name,
    emoji: CATEGORY_EMOJIS[name] ?? '🗂️',
    className: PASTEL_COLORS[index % PASTEL_COLORS.length],
  }))
}