import { useCallback, useEffect, useState } from 'react'
import {
  fetchProductosBajoStock,
  fetchVentasDeHoy,
} from '../services/dashboard'
import type { ProductosRow } from '../types/database.types'

export function useDashboardStats() {
  const [ventasHoy, setVentasHoy] = useState(0)
  const [lowStock, setLowStock] = useState<ProductosRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [total, productosBajoStock] = await Promise.all([
          fetchVentasDeHoy(),
          fetchProductosBajoStock(),
        ])
        if (!cancelled) {
          setVentasHoy(total)
          setLowStock(productosBajoStock)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Error al cargar el resumen',
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

  return { ventasHoy, lowStock, loading, error, refresh }
}