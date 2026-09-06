export interface Category {
  id: string
  label: string
  emoji: string
  className: string
}

export interface Product {
  id: string
  name: string
  price: number
  categoryId: string
  barcode?: string
}

export interface CartItem {
  product: Product
  quantity: number
}