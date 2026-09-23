import { useCallback, useEffect, useMemo, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import {
  fetchCostosProductos,
  fetchDetalleVentasMes,
  fetchIngresosMes,
  fetchVentasMes,
} from '../services/reportes'
import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'
import {
  calcularReporteMensual,
  type ReporteMensual,
} from '../utils/reporteFinanciero'

interface CacheReporte {
  ventas: VentasRow[]
  ingresos: IngresosMercaderiaRow[]
  detalles: DetalleVentasRow[]
}

function readReporteCache(clave: string): CacheReporte | null {
  try {
    const raw = localStorage.getItem(`bodega:reporte-mensual-cache:${clave}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CacheReporte> | null
    if (
      !parsed ||
      !Array.isArray(parsed.ventas) ||
      !Array.isArray(parsed.ingresos) ||
      !Array.isArray(parsed.detalles)
    ) {
      return null
    }
    return {
      ventas: parsed.ventas,
      ingresos: parsed.ingresos,
      detalles: parsed.detalles,
    }
  } catch {
    return null
  }
}

function writeReporteCache(clave: string, cache: CacheReporte): void {
  try {
    localStorage.setItem(
      `bodega:reporte-mensual-cache:${clave}`,
      JSON.stringify(cache),
    )
  } catch {
    // almacenamiento lleno o bloqueado: no es crítico
  }
}

export function useReporteMensual(
  desde: Date,
  hasta: Date,
): {
  reporte: ReporteMensual
  loading: boolean
  error: string | null
  refresh: () => void
} {
  const clave = useMemo(() => {
    const pad = (n: number): string => String(n).padStart(2, '0')
    return `${desde.getFullYear()}-${pad(desde.getMonth() + 1)}`
  }, [desde])

  const [ventas, setVentas] = useState<VentasRow[]>(
    () => readReporteCache(clave)?.ventas ?? [],
  )
  const [ingresos, setIngresos] = useState<IngresosMercaderiaRow[]>(
    () => readReporteCache(clave)?.ingresos ?? [],
  )
  const [detalles, setDetalles] = useState<DetalleVentasRow[]>(
    () => readReporteCache(clave)?.detalles ?? [],
  )
  const [costoProductos, setCostoProductos] = useState<Map<string, number>>(
    new Map(),
  )
  const [loading, setLoading] = useState(
    () => readReporteCache(clave) === null,
  )
  const [error, setError] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false

    const desdeISO = desde.toISOString()
    const hastaISO = hasta.toISOString()

    void (async () => {
      try {
        const [ventasMes, ingresosMes] = await Promise.all([
          fetchVentasMes(desdeISO, hastaISO),
          fetchIngresosMes(desdeISO, hastaISO),
        ])
        const detalleMes =
          ventasMes.length > 0
            ? await fetchDetalleVentasMes(ventasMes.map((v) => v.id))
            : []

        const sinCosto = detalleMes.filter(
          (d) => d.costo_unitario === null && d.producto_id !== null,
        )
        const productoIds = Array.from(
          new Set(sinCosto.map((d) => d.producto_id as string)),
        )
        const costos =
          productoIds.length > 0
            ? await fetchCostosProductos(productoIds)
            : new Map()

        if (cancelled) return
        setVentas(ventasMes)
        setIngresos(ingresosMes)
        setDetalles(detalleMes)
        setCostoProductos(costos)
        setError(null)
        setLoading(false)
        writeReporteCache(clave, {
          ventas: ventasMes,
          ingresos: ingresosMes,
          detalles: detalleMes,
        })
      } catch (cause) {
        if (cancelled) return
        setError(
          cause instanceof Error ? cause.message : 'No se pudo cargar el reporte del mes.',
        )
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [desde, hasta, clave, reload])

  const refresh = useCallback(() => setReload((r) => r + 1), [])

  useEffect(() => subscribeToDataChanges(refresh), [refresh])

  const reporte = useMemo(
    () => calcularReporteMensual(ventas, detalles, ingresos, costoProductos),
    [ventas, detalles, ingresos, costoProductos],
  )

  return { reporte, loading, error, refresh }
}