import { useState } from 'react'
import type { ProductosRow } from '../types/database.types'

interface InventoryModalsResult {
  modalOpen: boolean
  setModalOpen: (value: boolean) => void
  initialStockOpen: boolean
  setInitialStockOpen: (value: boolean) => void
  editingProduct: ProductosRow | null
  setEditingProduct: (value: ProductosRow | null) => void
  purchasingProduct: ProductosRow | null
  setPurchasingProduct: (value: ProductosRow | null) => void
  adjustingProduct: ProductosRow | null
  setAdjustingProduct: (value: ProductosRow | null) => void
  deletingProduct: ProductosRow | null
  setDeletingProduct: (value: ProductosRow | null) => void
  kardexProduct: ProductosRow | null
  setKardexProduct: (value: ProductosRow | null) => void
  closeAll: () => void
}

/**
 * Hook que centraliza el estado de todos los modales de inventario.
 * Evita tener múltiples useState dispersos en el componente.
 */
export function useInventoryModals(): InventoryModalsResult {
  const [modalOpen, setModalOpen] = useState(false)
  const [initialStockOpen, setInitialStockOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductosRow | null>(null)
  const [purchasingProduct, setPurchasingProduct] = useState<ProductosRow | null>(null)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductosRow | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductosRow | null>(null)
  const [kardexProduct, setKardexProduct] = useState<ProductosRow | null>(null)

  const closeAll = (): void => {
    setModalOpen(false)
    setInitialStockOpen(false)
    setEditingProduct(null)
    setPurchasingProduct(null)
    setAdjustingProduct(null)
    setDeletingProduct(null)
    setKardexProduct(null)
  }

  return {
    modalOpen,
    setModalOpen,
    initialStockOpen,
    setInitialStockOpen,
    editingProduct,
    setEditingProduct,
    purchasingProduct,
    setPurchasingProduct,
    adjustingProduct,
    setAdjustingProduct,
    deletingProduct,
    setDeletingProduct,
    kardexProduct,
    setKardexProduct,
    closeAll,
  }
}
