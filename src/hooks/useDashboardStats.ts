import { useCallback, useEffect, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import {
  fetchDashboardResumen,
  fetchProductosBajoStock,
} from '../services/dashboard'
import type {
  DashboardResumenResult,
  ProductosRow,
} from '../types/database.types'

export function useDashboardStats() {
  const [resumen, setResumen] = useState<DashboardResumenResult | null>(null)
  const [lowStock, setLowStock] = useState<ProductosRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [resumenData, productosBajoStock] = await Promise.all([
          fetchDashboardResumen(),
          fetchProductosBajoStock(),
        ])
        if (!cancelled) {
          setResumen(resumenData)
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

  useEffect(() => {
    return subscribeToDataChanges(() => refresh(true))
  }, [refresh])

  return { resumen, lowStock, loading, error, refresh }
}