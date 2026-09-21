import { useCallback, useEffect, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import { fetchIngresosHistory, fetchVentasHistory } from '../services/history'
import { fetchProducts } from '../services/products'
import { fetchProveedores } from '../services/purchases'
import type { IngresosMercaderiaRow, VentasRow } from '../types/database.types'

const VENTAS_CACHE_KEY = 'bodega:ventas-cache:v1'
const INGRESOS_CACHE_KEY = 'bodega:ingresos-cache:v1'

interface IngresosCache {
  ingresos: IngresosMercaderiaRow[]
  proveedorMap: Record<string, string>
  productoMap: Record<string, string>
}

function readVentasCache(): VentasRow[] | null {
  try {
    const raw = localStorage.getItem(VENTAS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed as VentasRow[]
  } catch {
    return null
  }
}

function writeVentasCache(ventas: VentasRow[]): void {
  try {
    localStorage.setItem(VENTAS_CACHE_KEY, JSON.stringify(ventas))
  } catch {
    // almacenamiento lleno o bloqueado: no es crítico
  }
}

function readIngresosCache(): IngresosCache | null {
  try {
    const raw = localStorage.getItem(INGRESOS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<IngresosCache> | null
    if (!parsed || !Array.isArray(parsed.ingresos)) return null
    return {
      ingresos: parsed.ingresos,
      proveedorMap: parsed.proveedorMap ?? {},
      productoMap: parsed.productoMap ?? {},
    }
  } catch {
    return null
  }
}

function writeIngresosCache(cache: IngresosCache): void {
  try {
    localStorage.setItem(INGRESOS_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // almacenamiento lleno o bloqueado: no es crítico
  }
}

export function useVentasHistory() {
  const [cached] = useState<VentasRow[] | null>(() => readVentasCache())
  const [ventas, setVentas] = useState<VentasRow[]>(() => cached ?? [])
  // Solo primera vez (sin caché) mostramos skeletons. Al volver de
  // otra sección ya hay datos y se muestra directo.
  const [loading, setLoading] = useState(() => cached === null)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const data = await fetchVentasHistory()
        if (!cancelled) {
          setVentas(data)
          writeVentasCache(data)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          // Si hay caché, no rompemos la vista: mostramos datos guardados
          if (cached === null) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'No se pudo cargar el historial',
            )
          } else {
            setError(null)
          }
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

  return { ventas, loading, error, refresh }
}

export function useIngresosHistory() {
  const [cached] = useState<IngresosCache | null>(() => readIngresosCache())
  const [ingresos, setIngresos] = useState<IngresosMercaderiaRow[]>(
    () => cached?.ingresos ?? [],
  )
  const [proveedorMap, setProveedorMap] = useState<Record<string, string>>(
    () => cached?.proveedorMap ?? {},
  )
  const [productoMap, setProductoMap] = useState<Record<string, string>>(
    () => cached?.productoMap ?? {},
  )
  // Solo primera vez (sin caché) mostramos skeletons. Al volver de
  // otra sección ya hay datos y se muestra directo.
  const [loading, setLoading] = useState(() => cached === null)
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

          writeIngresosCache({
            ingresos: data,
            proveedorMap: proveedoresById,
            productoMap: productosById,
          })
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          // Si hay caché, no rompemos la vista: mostramos datos guardados
          if (cached === null) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'No se pudo cargar el historial',
            )
          } else {
            setError(null)
          }
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

  return { ingresos, proveedorMap, productoMap, loading, error, refresh }
}
