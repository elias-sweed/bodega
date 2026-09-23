import { useCallback, useEffect, useMemo, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import {
  fetchDetalleVentasMes,
  fetchIngresosMes,
  fetchProductosReporte,
  fetchVentasMes,
} from '../services/reportes'
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
  const [ventas, setVentas] = useState<VentasRow[]>([])
  const [ingresos, setIngresos] = useState<IngresosMercaderiaRow[]>([])
  const [detalles, setDetalles] = useState<DetalleVentasRow[]>([])
  const [productos, setProductos] = useState<
    Map<string, { nombre: string; costo: number }>
  >(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
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
