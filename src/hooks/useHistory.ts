import { useCallback, useEffect, useState } from 'react'
import { fetchIngresosHistory, fetchVentasHistory } from '../services/history'
import { fetchProducts } from '../services/products'
import { fetchProveedores } from '../services/purchases'
import type { IngresosMercaderiaRow, VentasRow } from '../types/database.types'

export function useVentasHistory() {
  const [ventas, setVentas] = useState<VentasRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const data = await fetchVentasHistory()
        if (!cancelled) {
          setVentas(data)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar el historial',
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

  return { ventas, loading, error, refresh }
}

export function useIngresosHistory() {
  const [ingresos, setIngresos] = useState<IngresosMercaderiaRow[]>([])
  const [proveedorMap, setProveedorMap] = useState<Record<string, string>>({})
  const [productoMap, setProductoMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [data, proveedores, productos] = await Promise.all([
          fetchIngresosHistory(),
          fetchProveedores(),
          fetchProducts(),
        ])
        if (!cancelled) {
          setIngresos(data)

          const proveedoresById: Record<string, string> = {}
          for (const proveedor of proveedores) {
            proveedoresById[proveedor.id] = proveedor.nombre
          }
          setProveedorMap(proveedoresById)

          const productosById: Record<string, string> = {}
          for (const producto of productos) {
            productosById[producto.id] = producto.nombre
          }
          setProductoMap(productosById)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar el historial',
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

  return { ingresos, proveedorMap, productoMap, loading, error, refresh }
}