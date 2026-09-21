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

const CACHE_KEY = 'bodega:dashboard-cache:v1'

interface DashboardCache {
  resumen: DashboardResumenResult
  lowStock: ProductosRow[]
  savedAt: number
}

function readCache(): DashboardCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DashboardCache
    if (!parsed?.resumen || !Array.isArray(parsed?.lowStock)) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(resumen: DashboardResumenResult, lowStock: ProductosRow[]): number {
  const savedAt = Date.now()
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ resumen, lowStock, savedAt } satisfies DashboardCache),
    )
  } catch {
    // almacenamiento lleno o bloqueado: no es crítico
  }
  return savedAt
}

export function useDashboardStats() {
  const [cached] = useState<DashboardCache | null>(() => readCache())
  const [resumen, setResumen] = useState<DashboardResumenResult | null>(
    () => cached?.resumen ?? null,
  )
  const [lowStock, setLowStock] = useState<ProductosRow[]>(
    () => cached?.lowStock ?? [],
  )
  // Solo primera vez (sin caché) mostramos skeletons. Al volver de
  // Caja / Inventario / etc. ya hay datos y se muestra directo.
  const [loading, setLoading] = useState(() => cached?.resumen == null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<number | null>(
    () => cached?.savedAt ?? null,
  )
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    const hasData = resumen !== null
    if (hasData) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }

    void (async () => {
      try {
        const [resumenData, productosBajoStock] = await Promise.all([
          fetchDashboardResumen(),
          fetchProductosBajoStock(),
        ])
        if (cancelled) return
        setResumen(resumenData)
        setLowStock(productosBajoStock)
        setUpdatedAt(writeCache(resumenData, productosBajoStock))
        setError(null)
      } catch (cause) {
        if (cancelled) return
        // Si hay caché, no rompemos la vista: mostramos datos + error suave
        if (resumen === null) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Error al cargar el resumen',
          )
        } else {
          setError(null)
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
    // Solo re-ejecutar ante refresh manual / eventos, no ante cada render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken])

  const refresh = useCallback((_silent = false): void => {
    setError(null)
    // Nunca más mostramos pantalla de "Cargando" si ya hay datos:
    // solo revalidamos en segundo plano.
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    return subscribeToDataChanges(() => refresh(true))
  }, [refresh])

  return { resumen, lowStock, loading, isRefreshing, error, updatedAt, refresh }
}
