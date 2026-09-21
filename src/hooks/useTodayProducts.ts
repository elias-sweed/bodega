import { useEffect, useMemo, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import { fetchDetallesByVentas, fetchProductNames } from '../services/history'
import { supabase } from '../services/supabase'

export interface ProductoHoy {
  id: string
  nombre: string
  cantidad: number
  precioUnitario: number
  cobrado: number
  costoTotal: number
  ganancia: number
}

export interface ResumenRango {
  productos: ProductoHoy[]
  total: number
  count: number
  efectivo: number
  yape: number
  plin: number
  ganancia: number
}

interface Rango {
  desde: Date
  hasta: Date
  clave: string
}

function rangoHoy(): Rango {
  const desde = new Date()
  desde.setHours(0, 0, 0, 0)
  return { desde, hasta: new Date(), clave: 'hoy' }
}

/**
 * Totales + productos de un rango de fechas (por defecto: hoy).
 * `claveCache` distingue cada rango en localStorage.
 */
export function useTodayProducts(rango?: Rango, claveCache = 'hoy', activo = true) {
  const [data, setData] = useState<ResumenRango>({
    productos: [],
    total: 0,
    count: 0,
    efectivo: 0,
    yape: 0,
    plin: 0,
    ganancia: 0,
  })
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  const cacheKey = `bodega:hoy-productos-cache:${claveCache}`
  // Congelados por render: recalcularlos aquí provocaría refetch infinito
  const desdeISO = useMemo(
    () => (rango ?? rangoHoy()).desde.toISOString(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rango, claveCache],
  )

  useEffect(() => {
    if (!activo) {
      setLoading(false)
      return
    }
    let cancelled = false

    // Cache primero (por rango): se muestra directo al volver
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { data?: ResumenRango }
        if (parsed?.data) setData(parsed.data)
      }
    } catch {
      // sin caché: se carga de red
    }

    void (async () => {
      try {
        // `hasta` se calcula al momento de pedir (hoy sigue avanzando)
        const hastaISO = (rango?.hasta ?? new Date()).toISOString()
        const { data: ventas, error } = await supabase
          .from('ventas')
          .select('id, total, metodo_pago')
          .gte('fecha', desdeISO)
          .lt('fecha', hastaISO)
        if (error) throw error
        const lista = (ventas ?? []) as {
          id: string
          total: number
          metodo_pago: string
        }[]
        const ids = lista.map((v) => String(v.id))
        const total = lista.reduce((s, v) => s + (Number(v.total) || 0), 0)
        const porMetodo = (m: string): number =>
          lista
            .filter((v) => v.metodo_pago === m)
            .reduce((s, v) => s + (Number(v.total) || 0), 0)

        let productos: ProductoHoy[] = []
        let ganancia = 0
        if (ids.length > 0) {
          const items = await fetchDetallesByVentas(ids)
          const pids = [
            ...new Set(
              items.map((i) => i.producto_id).filter((id): id is string => id !== null),
            ),
          ]
          const rows = await fetchProductNames(pids)
          const info = new Map(rows.map((r) => [r.id, r] as const))
          const porProducto = new Map<string, ProductoHoy>()
          for (const item of items) {
            const pid = item.producto_id ?? 'sin-id'
            const actual = porProducto.get(pid) ?? {
              id: pid,
              nombre: info.get(pid)?.nombre ?? 'Producto eliminado',
              cantidad: 0,
              precioUnitario: item.precio_unitario,
              cobrado: 0,
              costoTotal: 0,
              ganancia: 0,
            }
            const costo = item.costo_unitario ?? info.get(pid)?.costo ?? 0
            actual.cantidad += item.cantidad
            actual.cobrado += item.subtotal
            actual.costoTotal += costo * item.cantidad
            actual.ganancia += item.subtotal - costo * item.cantidad
            porProducto.set(pid, actual)
          }
          productos = [...porProducto.values()].sort((a, b) => b.cobrado - a.cobrado)
          ganancia = productos.reduce((s, p) => s + p.ganancia, 0)
        }

        if (cancelled) return
        const result: ResumenRango = {
          productos,
          total,
          count: lista.length,
          efectivo: porMetodo('Efectivo'),
          yape: porMetodo('Yape'),
          plin: porMetodo('Plin'),
          ganancia,
        }
        setData(result)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ data: result }))
        } catch {
          // sin almacenamiento: se sigue mostrando lo cargado
        }
      } catch {
        // sin red: se queda lo de caché
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken, desdeISO, cacheKey, activo])

  useEffect(() => {
    return subscribeToDataChanges(() => setReloadToken((t) => t + 1))
  }, [])

  return { ...data, loading }
}
