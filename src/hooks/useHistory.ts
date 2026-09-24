import { useCallback, useEffect, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import {
  ensureIngresosHistoryLoaded,
  ensureVentasHistoryLoaded,
  getHistoryCache,
  refreshIngresosHistory,
  refreshVentasHistory,
  subscribeToHistory,
} from '../services/historyCache'
import type {
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'

interface HistorialState<T> {
  data: T
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useVentasHistory(): HistorialState<VentasRow[]> {
  const [ventas, setVentas] = useState<VentasRow[]>(() => {
    return getHistoryCache().ventas ?? []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    const cache = getHistoryCache()
    return cache.ventas === null && cache.ventasError === null
  })
  const [error, setError] = useState<string | null>(() => {
    return getHistoryCache().ventasError
  })

  useEffect(() => {
    const update = (): void => {
      const cache = getHistoryCache()
      setVentas(cache.ventas ?? [])
      setError(cache.ventasError)
      setLoading(cache.ventas === null && cache.ventasError === null)
    }
    const unsubscribe = subscribeToHistory(update)
    ensureVentasHistoryLoaded()
    return unsubscribe
  }, [])

  const refresh = useCallback(() => {
    void refreshVentasHistory()
  }, [])
  useEffect(() => subscribeToDataChanges(refresh), [refresh])

  return { data: ventas, loading, error, refresh }
}

export function useIngresosHistory(): {
  data: IngresosMercaderiaRow[]
  proveedorMap: Record<string, string>
  productoMap: Record<string, string>
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const [ingresos, setIngresos] = useState<IngresosMercaderiaRow[]>(() => {
    return getHistoryCache().ingresos ?? []
  })
  const [proveedorMap, setProveedorMap] = useState<Record<string, string>>(
    () => getHistoryCache().proveedorMap,
  )
  const [productoMap, setProductoMap] = useState<Record<string, string>>(
    () => getHistoryCache().productoMap,
  )
  const [loading, setLoading] = useState<boolean>(() => {
    const cache = getHistoryCache()
    return cache.ingresos === null && cache.ingresosError === null
  })
  const [error, setError] = useState<string | null>(() => {
    return getHistoryCache().ingresosError
  })

  useEffect(() => {
    const update = (): void => {
      const cache = getHistoryCache()
      setIngresos(cache.ingresos ?? [])
      setProveedorMap(cache.proveedorMap)
      setProductoMap(cache.productoMap)
      setError(cache.ingresosError)
      setLoading(cache.ingresos === null && cache.ingresosError === null)
    }
    const unsubscribe = subscribeToHistory(update)
    ensureIngresosHistoryLoaded()
    return unsubscribe
  }, [])

  const refresh = useCallback(() => {
    void refreshIngresosHistory()
  }, [])
  useEffect(() => subscribeToDataChanges(refresh), [refresh])

  return {
    data: ingresos,
    proveedorMap,
    productoMap,
    loading,
    error,
    refresh,
  }
}