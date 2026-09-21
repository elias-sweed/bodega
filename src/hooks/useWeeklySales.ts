import { useEffect, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import { fetchVentasUltimos7Dias, type VentaDiaria } from '../services/dashboard'

const CACHE_KEY = 'bodega:ventas-7d-cache:v1'

export interface DiaVenta {
  clave: string
  etiqueta: string
  total: number
  esHoy: boolean
}

function buildSemana(ventas: VentaDiaria[]): DiaVenta[] {
  const porDia = new Map<string, number>()
  for (const v of ventas) {
    const d = new Date(v.fecha)
    const clave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    porDia.set(clave, (porDia.get(clave) ?? 0) + v.total)
  }
  const dias: DiaVenta[] = []
  const hoy = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy)
    d.setDate(d.getDate() - i)
    const clave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    dias.push({
      clave,
      etiqueta: d.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''),
      total: porDia.get(clave) ?? 0,
      esHoy: i === 0,
    })
  }
  return dias
}

function readCache(): VentaDiaria[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ventas?: VentaDiaria[] }
    return Array.isArray(parsed?.ventas) ? parsed.ventas : null
  } catch {
    return null
  }
}

export function useWeeklySales() {
  const [ventas, setVentas] = useState<VentaDiaria[]>(() => readCache() ?? [])
  const [loading, setLoading] = useState(() => readCache() === null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchVentasUltimos7Dias()
        if (cancelled) return
        setVentas(data)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ventas: data }))
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

  const dias = buildSemana(ventas)
  const ayerTotal = dias.length >= 2 ? dias[dias.length - 2].total : 0
  return { dias, ayerTotal, loading }
}
