import { useCallback, useEffect, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import { fetchIngresosHistory, fetchVentasHistory } from '../services/history'
import { fetchProducts } from '../services/products'
import { fetchProveedores } from '../services/purchases'
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
  const [ventas, setVentas] = useState<VentasRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await fetchVentasHistory()
        if (!cancelled) {
          setVentas(data)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])
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
  const [ingresos, setIngresos] = useState<IngresosMercaderiaRow[]>([])
  const [proveedorMap, setProveedorMap] = useState<Record<string, string>>({})
  const [productoMap, setProductoMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const [data, proveedores, productos] = await Promise.all([
          fetchIngresosHistory(),
          fetchProveedores(),
          fetchProducts(),
        ])
        if (cancelled) return
        setIngresos(data)
        setProveedorMap(Object.fromEntries(proveedores.map((row) => [row.id, row.nombre])))
        setProductoMap(Object.fromEntries(productos.map((row) => [row.id, row.nombre])))
        setError(null)
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])
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
