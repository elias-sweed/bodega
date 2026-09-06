import { useCallback, useEffect, useState } from 'react'
import { fetchProducts, insertProduct } from '../services/products'
import type { ProductosInsert, ProductosRow } from '../types/database.types'

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

  const refresh = useCallback((): void => {
    setLoading(true)
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

  return { products, loading, error, refresh, addProduct }
}