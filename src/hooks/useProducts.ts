import { useCallback, useEffect, useState } from 'react'
import {
  deleteProduct as removeProduct,
  insertProduct,
  actualizarProducto,
} from '../services/products'
import {
  ensureProductsLoaded,
  getProductsCache,
  refreshProductsCache,
  subscribeToProducts,
} from '../services/productsCache'
import type {
  ProductosInsert,
  ProductosRow,
} from '../types/database.types'

export function useProducts() {
  const [products, setProducts] = useState<ProductosRow[]>(() => {
    const cached = getProductsCache()
    return cached.products ?? []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getProductsCache()
    return cached.products === null
  })
  const [error, setError] = useState<string | null>(() => {
    const cached = getProductsCache()
    return cached.error
  })

  useEffect(() => {
    const update = (): void => {
      const cached = getProductsCache()
      setProducts(cached.products ?? [])
      setError(cached.error)
      if (cached.products !== null || cached.error !== null) {
        setLoading(false)
      }
    }
    const unsubscribe = subscribeToProducts(update)
    ensureProductsLoaded()
    return unsubscribe
  }, [])

  const refresh = useCallback((silent = false): void => {
    // Nunca más pantalla de "Cargando" si ya hay productos:
    // solo revalida en segundo plano.
    if (!silent) {
      const cached = getProductsCache()
      if (cached.products === null || cached.products.length === 0) {
        setLoading(true)
      }
    }
    refreshProductsCache()
  }, [])

  const addProduct = useCallback(
    async (input: ProductosInsert): Promise<ProductosRow> => {
      const created = await insertProduct(input)
      await refreshProductsCache()
      return created
    },
    [],
  )

  const updateProduct = useCallback(
    async (id: string, input: {
      nombre: string
      categoria: string
      codigo_barras: string | null
      precio_venta: number
      costo: number
      stock_minimo: number
      nuevoStock: number
      motivo: string
    }): Promise<void> => {
      await actualizarProducto({
        p_id: id,
        p_nombre: input.nombre,
        p_categoria: input.categoria,
        p_codigo_barras: input.codigo_barras,
        p_precio_venta: input.precio_venta,
        p_costo: input.costo,
        p_stock_minimo: input.stock_minimo,
        p_nuevo_stock: input.nuevoStock,
        p_motivo: input.motivo,
      })
      await refreshProductsCache()
    },
    [],
  )

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    await removeProduct(id)
    await refreshProductsCache()
  }, [])

  return { products, loading, error, refresh, addProduct, updateProduct, deleteProduct }
}