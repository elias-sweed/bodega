import type { Category, Product } from '../types'

export const CATEGORIES: Category[] = [
  {
    id: 'desayuno',
    label: 'Desayuno',
    emoji: '🥐',
    className: 'bg-amber-100 text-amber-900 hover:bg-amber-200',
  },
  {
    id: 'impresiones',
    label: 'Impresiones',
    emoji: '🖨️',
    className: 'bg-blue-100 text-blue-900 hover:bg-blue-200',
  },
  {
    id: 'snacks',
    label: 'Snacks',
    emoji: '🍿',
    className: 'bg-orange-100 text-orange-900 hover:bg-orange-200',
  },
  {
    id: 'bebidas',
    label: 'Bebidas',
    emoji: '🥤',
    className: 'bg-cyan-100 text-cyan-900 hover:bg-cyan-200',
  },
  {
    id: 'dulces',
    label: 'Dulces',
    emoji: '🍬',
    className: 'bg-rose-100 text-rose-900 hover:bg-rose-200',
  },
  {
    id: 'farmacia',
    label: 'Farmacia',
    emoji: '💊',
    className: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200',
  },
]

export const PRODUCTS: Product[] = [
  { id: 'p001', name: 'Hot cake sencillo', price: 25, categoryId: 'desayuno' },
  { id: 'p002', name: 'Hot cake doble', price: 35, categoryId: 'desayuno' },
  { id: 'p003', name: 'Chilaquiles', price: 40, categoryId: 'desayuno' },
  { id: 'p004', name: 'Café americano', price: 20, categoryId: 'desayuno' },
  { id: 'p005', name: 'Jugo de naranja', price: 18, categoryId: 'desayuno' },
  { id: 'p006', name: 'Pan dulce', price: 12, categoryId: 'desayuno' },

  { id: 'p010', name: 'Impresión B/N (hoja)', price: 2, categoryId: 'impresiones' },
  { id: 'p011', name: 'Impresión a color', price: 5, categoryId: 'impresiones' },
  { id: 'p012', name: 'Escaneo documento', price: 3, categoryId: 'impresiones' },
  { id: 'p013', name: 'Fotocopia', price: 2, categoryId: 'impresiones' },

  { id: 'p020', name: 'Papitas chicas', price: 12, categoryId: 'snacks', barcode: '7501234567890' },
  { id: 'p021', name: 'Papitas grandes', price: 20, categoryId: 'snacks', barcode: '7501234567891' },
  { id: 'p022', name: 'Cacahuates', price: 10, categoryId: 'snacks' },
  { id: 'p023', name: 'Palomitas', price: 15, categoryId: 'snacks' },

  { id: 'p030', name: 'Agua natural', price: 10, categoryId: 'bebidas' },
  { id: 'p031', name: 'Refresco 600 ml', price: 18, categoryId: 'bebidas' },
  { id: 'p032', name: 'Jugo', price: 15, categoryId: 'bebidas' },
  { id: 'p033', name: 'Gatorade', price: 22, categoryId: 'bebidas' },

  { id: 'p040', name: 'Chocolate', price: 15, categoryId: 'dulces' },
  { id: 'p041', name: 'Gomitas', price: 8, categoryId: 'dulces' },
  { id: 'p042', name: 'Paleta', price: 5, categoryId: 'dulces' },

  { id: 'p050', name: 'Paracetamol', price: 30, categoryId: 'farmacia' },
  { id: 'p051', name: 'Curitas (caja)', price: 35, categoryId: 'farmacia' },
  { id: 'p052', name: 'Alcohol 70°', price: 28, categoryId: 'farmacia' },
]