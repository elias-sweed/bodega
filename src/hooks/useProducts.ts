import { useCallback, useEffect, useState } from 'react'
import {
  deleteProduct as removeProduct,
  fetchProducts,
  insertProduct,
  updateProduct as editProduct,
} from '../services/products'
import type {
  ProductosInsert,
  ProductosRow,
  ProductosUpdate,
} from '../types/database.types'

function sortByName(products: ProductosRow[]): ProductosRow[] {
  return [...products].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function useProducts() {
  const [products, setProducts] = useState<ProductosRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const data = await fetchProducts()
        if (!cancelled) {
          setProducts(sortByName(data))
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Error al cargar los productos',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refresh = useCallback((silent = false): void => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    setReloadToken((token) => token + 1)
  }, [])

  const addProduct = useCallback(
    async (input: ProductosInsert): Promise<ProductosRow> => {
      const created = await insertProduct(input)
      setProducts((current) => sortByName([...current, created]))
      return created
    },
    [],
  )

  const updateProduct = useCallback(
    async (id: string, updates: ProductosUpdate): Promise<void> => {
      const updated = await editProduct(id, updates)
      setProducts((current) =>
        sortByName(current.map((product) => (product.id === id ? updated : product))),
      )
    },
    [],
  )

  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    await removeProduct(id)
    setProducts((current) => current.filter((product) => product.id !== id))
  }, [])

  return { products, loading, error, refresh, addProduct, updateProduct, deleteProduct }
}