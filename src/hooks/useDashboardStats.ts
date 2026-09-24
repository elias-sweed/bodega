import { useCallback, useEffect, useState } from 'react'
import {
  getDashboardCache,
  subscribeToDashboard,
  ensureDashboardLoaded,
  refreshDashboardCache,
} from '../services/dashboardCache'
import type {
  DashboardResumenResult,
  ProductosRow,
} from '../types/database.types'

export function useDashboardStats(): {
  resumen: DashboardResumenResult | null
  lowStock: ProductosRow[]
  loading: boolean
  isRefreshing: boolean
  error: string | null
  updatedAt: number | null
  refresh: () => Promise<void>
} {
  const [resumen, setResumen] = useState<DashboardResumenResult | null>(() => {
    return getDashboardCache().resumen
  })
  const [lowStock, setLowStock] = useState<ProductosRow[]>(() => {
    return getDashboardCache().lowStock ?? []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    const data = getDashboardCache()
    return data.resumen === null && data.error === null
  })
  const [isRefreshing, setIsRefreshing] = useState<boolean>(() => {
    return getDashboardCache().inFlight
  })
  const [error, setError] = useState<string | null>(() => {
    return getDashboardCache().error
  })
  const [updatedAt, setUpdatedAt] = useState<number | null>(() => null)

  useEffect(() => {
    const update = (): void => {
      const data = getDashboardCache()
      setResumen(data.resumen)
      setLowStock(data.lowStock ?? [])
      setError(data.error)
      setIsRefreshing(data.inFlight)
      setLoading(data.resumen === null && data.error === null)
      if (data.resumen !== null && !data.inFlight) setUpdatedAt(Date.now())
    }
    const unsubscribe = subscribeToDashboard(update)
    ensureDashboardLoaded()
    return unsubscribe
  }, [])

  const refresh = useCallback((): Promise<void> => {
    const data = getDashboardCache()
    setLoading(data.resumen === null && data.error === null)
    return refreshDashboardCache().finally(() => setIsRefreshing(false))
  }, [])

  return {
    resumen,
    lowStock,
    loading,
    isRefreshing,
    error,
    updatedAt,
    refresh,
  }
}