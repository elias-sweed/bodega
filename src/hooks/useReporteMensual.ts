import { useCallback, useEffect, useMemo, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import {
  fetchDetalleVentasMes,
  fetchIngresosMes,
  fetchProductosReporte,
  fetchVentasMes,
} from '../services/reportes'
import {
  applyReporteData,
  getReporteCache,
  type ReporteCacheSlot,
} from '../services/reporteCache'
import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'
import { calcularReporteMensual, type ReporteMensual } from '../utils/reporteFinanciero'

export function useReporteMensual(
  desde: Date,
  hasta: Date,
): {
  reporte: ReporteMensual
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const desdeISO = useMemo(() => desde.toISOString(), [desde])
  const hastaISO = useMemo(() => hasta.toISOString(), [hasta])
  const [cached] = useState<ReporteCacheSlot | null>(() => {
    return getReporteCache(desdeISO, hastaISO)
  })
  const [ventas, setVentas] = useState<VentasRow[]>(cached?.ventas ?? [])
  const [ingresos, setIngresos] = useState<IngresosMercaderiaRow[]>(
    cached?.ingresos ?? [],
  )
  const [detalles, setDetalles] = useState<DetalleVentasRow[]>(
    cached?.detalles ?? [],
  )
  const [productos, setProductos] = useState<
    Map<string, { nombre: string; costo: number }>
  >(cached?.productos ?? new Map())
  const [loading, setLoading] = useState<boolean>(cached === null)
  const [error, setError] = useState<string | null>(cached?.error ?? null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const hasCache = getReporteCache(desdeISO, hastaISO) !== null
    if (hasCache && reload === 0) {
      return
    }
    let cancelled = false
    void (async () => {
      if (getReporteCache(desdeISO, hastaISO) === null) setLoading(true)
      try {
        const [ventasPeriodo, ingresosPeriodo] = await Promise.all([
          fetchVentasMes(desdeISO, hastaISO),
          fetchIngresosMes(desdeISO, hastaISO),
        ])
        const detallePeriodo = ventasPeriodo.length
          ? await fetchDetalleVentasMes(ventasPeriodo.map((venta) => venta.id))
          : []
        const productoIds = [
          ...new Set(
            detallePeriodo
              .map((detalle) => detalle.producto_id)
              .filter((id): id is string => id !== null),
          ),
        ]
        const productosPeriodo = productoIds.length
          ? await fetchProductosReporte(productoIds)
          : new Map()
        if (cancelled) return
        setVentas(ventasPeriodo)
        setIngresos(ingresosPeriodo)
        setDetalles(detallePeriodo)
        setProductos(productosPeriodo)
        setError(null)
        applyReporteData(desdeISO, hastaISO, {
          ventas: ventasPeriodo,
          ingresos: ingresosPeriodo,
          detalles: detallePeriodo,
          productos: productosPeriodo,
          error: null,
        })
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el reporte.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [desdeISO, hastaISO, reload])

  const refresh = useCallback(() => setReload((value) => value + 1), [])
  useEffect(() => subscribeToDataChanges(refresh), [refresh])

  const reporte = useMemo(
    () => calcularReporteMensual(ventas, detalles, ingresos, productos),
    [ventas, detalles, ingresos, productos],
  )

  return { reporte, loading, error, refresh }
}