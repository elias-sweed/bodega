import { useEffect, useState } from 'react'
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

const CACHE_KEY = 'bodega:hoy-productos-cache:v1'

function readCache(): ProductoHoy[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { productos?: ProductoHoy[] }
    return Array.isArray(parsed?.productos) ? parsed.productos : null
  } catch {
    return null
  }
}

export function useTodayProducts() {
  const [productos, setProductos] = useState<ProductoHoy[]>(() => readCache() ?? [])
  const [loading, setLoading] = useState(() => readCache() === null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const inicio = new Date()
        inicio.setHours(0, 0, 0, 0)
        const { data: ventas, error } = await supabase
          .from('ventas')
          .select('id')
          .gte('fecha', inicio.toISOString())
        if (error) throw error
        const ids = (ventas ?? []).map((v) => String(v.id))
        if (ids.length === 0) {
          if (!cancelled) {
            setProductos([])
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({ productos: [] }))
            } catch {
              // sin almacenamiento: no es crítico
            }
          }
          return
        }
        const items = await fetchDetallesByVentas(ids)
        const pids = [...new Set(items.map((i) => i.producto_id).filter((id): id is string => id !== null))]
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
        const lista = [...porProducto.values()].sort((a, b) => b.cobrado - a.cobrado)
        if (cancelled) return
        setProductos(lista)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ productos: lista }))
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
  }, [reloadToken])

  useEffect(() => {
    return subscribeToDataChanges(() => setReloadToken((t) => t + 1))
  }, [])

  return { productos, loading }
}
