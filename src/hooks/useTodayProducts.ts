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

const EMPTY: ResumenRango = {
  productos: [],
  total: 0,
  count: 0,
  efectivo: 0,
  yape: 0,
  plin: 0,
  ganancia: 0,
}

export function useTodayProducts(rango?: Rango, _claveCache = 'hoy', activo = true) {
  const [data, setData] = useState<ResumenRango>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!activo) return
    let cancelled = false
    const desde = rango ? new Date(rango.desde) : new Date()
    if (!rango) desde.setHours(0, 0, 0, 0)
    const hasta = rango ? new Date(rango.hasta) : new Date()

    void (async () => {
      try {
        const { data: ventas, error } = await supabase
          .from('ventas')
          .select('id, total, metodo_pago')
          .gte('fecha', desde.toISOString())
          .lt('fecha', hasta.toISOString())
        if (error) throw error

        const lista = ventas ?? []
        const ids = lista.map((venta) => venta.id)
        const total = lista.reduce((sum, venta) => sum + Number(venta.total || 0), 0)
        const porMetodo = (metodo: string): number =>
          lista
            .filter((venta) => venta.metodo_pago === metodo)
            .reduce((sum, venta) => sum + Number(venta.total || 0), 0)

        let productos: ProductoHoy[] = []
        let ganancia = 0
        if (ids.length) {
          const items = await fetchDetallesByVentas(ids)
          const productoIds = [
            ...new Set(
              items
                .map((item) => item.producto_id)
                .filter((id): id is string => id !== null),
            ),
          ]
          const rows = await fetchProductNames(productoIds)
          const info = new Map(rows.map((row) => [row.id, row]))
          const grouped = new Map<string, ProductoHoy>()
          for (const item of items) {
            const id = item.producto_id ?? 'sin-id'
            const current = grouped.get(id) ?? {
              id,
              nombre: info.get(id)?.nombre ?? 'Producto eliminado',
              cantidad: 0,
              precioUnitario: item.precio_unitario,
              cobrado: 0,
              costoTotal: 0,
              ganancia: 0,
            }
            const costo = item.costo_unitario ?? info.get(id)?.costo ?? 0
            current.cantidad += item.cantidad
            current.cobrado += item.subtotal
            current.costoTotal += costo * item.cantidad
            current.ganancia += item.subtotal - costo * item.cantidad
            grouped.set(id, current)
          }
          productos = [...grouped.values()].sort((a, b) => b.cobrado - a.cobrado)
          ganancia = productos.reduce((sum, producto) => sum + producto.ganancia, 0)
        }

        if (!cancelled) {
          setData({
            productos,
            total,
            count: lista.length,
            efectivo: porMetodo('Efectivo'),
            yape: porMetodo('Yape'),
            plin: porMetodo('Plin'),
            ganancia,
          })
        }
      } catch {
        if (!cancelled) setData(EMPTY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [rango, activo, reloadToken])

  useEffect(() => subscribeToDataChanges(() => setReloadToken((token) => token + 1)), [])

  return { ...data, loading }
}
