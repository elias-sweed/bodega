import { useCallback, useMemo, useRef, useState } from 'react'
import type { ProductosRow } from '../types/database.types'
import { normalizeText } from '../utils/format'

interface CompraItem {
  producto: ProductosRow
  cantidad: string
  costoTotal: string
}

interface PurchaseFormResult {
  items: CompraItem[]
  addItem: (producto: ProductosRow) => void
  updateItem: (productoId: string, field: 'cantidad' | 'costoTotal', value: string) => void
  removeItem: (productoId: string) => void
  clearItems: () => void
  totalCompra: number
  isValid: boolean
  suggestedProducts: ProductosRow[]
  search: string
  setSearch: (value: string) => void
  searchOpen: boolean
  setSearchOpen: (value: boolean) => void
  addedProductIds: Set<string>
}

/**
 * Hook que encapsula la lógica del formulario de compra.
 * Maneja la lista de ítems, búsqueda, validación y totales.
 */
export function usePurchaseForm(products: ProductosRow[]): PurchaseFormResult {
  const [items, setItems] = useState<CompraItem[]>([])
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const addedProductIds = useMemo(
    () => new Set(items.map((item) => item.producto.id)),
    [items],
  )

  const suggestedProducts = useMemo(() => {
    const query = normalizeText(search)
    const list = query === '' ? products : products.filter(
      (producto) =>
        normalizeText(producto.nombre).includes(query) ||
        (producto.codigo_barras ?? '').toLowerCase().includes(query),
    )
    return list.filter((producto) => !addedProductIds.has(producto.id)).slice(0, 8)
  }, [products, search, addedProductIds])

  const totalCompra = items.reduce((total, item) => {
    const costo = Number(item.costoTotal)
    return total + (Number.isFinite(costo) && costo > 0 ? costo : 0)
  }, 0)

  const isValid =
    items.length > 0 &&
    items.every((item) => {
      const cantidad = Number(item.cantidad)
      const costo = Number(item.costoTotal)
      return (
        Number.isInteger(cantidad) &&
        cantidad >= 1 &&
        Number.isFinite(costo) &&
        costo >= 0
      )
    })

  const addItem = useCallback((producto: ProductosRow): void => {
    setItems((current) => [...current, { producto, cantidad: '', costoTotal: '' }])
    setSearch('')
    setSearchOpen(false)
  }, [])

  const updateItem = useCallback(
    (productoId: string, field: 'cantidad' | 'costoTotal', value: string): void => {
      setItems((current) =>
        current.map((item) =>
          item.producto.id === productoId ? { ...item, [field]: value } : item,
        ),
      )
    },
    [],
  )

  const removeItem = useCallback((productoId: string): void => {
    setItems((current) => current.filter((item) => item.producto.id !== productoId))
  }, [])

  const clearItems = useCallback((): void => {
    setItems([])
    setSearch('')
  }, [])

  return {
    items,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    totalCompra,
    isValid,
    suggestedProducts,
    search,
    setSearch,
    searchOpen,
    setSearchOpen,
    addedProductIds,
  }
}
