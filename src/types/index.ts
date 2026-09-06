import type { ProductosRow } from './database.types'

export interface Category {
  id: string
  label: string
  emoji: string
  className: string
}

export interface CartItem {
  product: ProductosRow
  quantity: number
}