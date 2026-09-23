import { useCallback, useEffect, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import { fetchDashboardResumen, fetchProductosBajoStock } from '../services/dashboard'
import type { DashboardResumenResult, ProductosRow } from '../types/database.types'

export function useDashboardStats() {
  const [resumen, setResumen] = useState<DashboardResumenResult | null>(null)
  const [lowStock, setLowStock] = useState<ProductosRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [resumenData, productosBajoStock] = await Promise.all([
          fetchDashboardResumen(),
          fetchProductosBajoStock(),
        ])
        if (cancelled) return
        setResumen(resumenData)
        setLowStock(productosBajoStock)
        setUpdatedAt(Date.now())
        setError(null)
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el resumen')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setIsRefreshing(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refresh = useCallback(() => {
    setIsRefreshing(true)
    setReloadToken((token) => token + 1)
  }, [])
  useEffect(() => subscribeToDataChanges(refresh), [refresh])

  return { resumen, lowStock, loading, isRefreshing, error, updatedAt, refresh }
}
