import { useEffect, useState } from 'react'
import { subscribeToDataChanges } from '../services/dataEvents'
import { fetchVentasUltimos7Dias, type VentaDiaria } from '../services/dashboard'

export interface DiaVenta {
  clave: string
  etiqueta: string
  total: number
  esHoy: boolean
}

function buildSemana(ventas: VentaDiaria[]): DiaVenta[] {
  const porDia = new Map<string, number>()
  for (const venta of ventas) {
    const date = new Date(venta.fecha)
    const clave = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    porDia.set(clave, (porDia.get(clave) ?? 0) + venta.total)
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const clave = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    return {
      clave,
      etiqueta: date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''),
      total: porDia.get(clave) ?? 0,
      esHoy: index === 6,
    }
  })
}

export function useWeeklySales() {
  const [ventas, setVentas] = useState<VentaDiaria[]>([])
  const [loading, setLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchVentasUltimos7Dias()
        if (!cancelled) setVentas(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  useEffect(() => subscribeToDataChanges(() => setReloadToken((token) => token + 1)), [])

  const dias = buildSemana(ventas)
  const ayerTotal = dias.length >= 2 ? dias[dias.length - 2].total : 0
  return { dias, ayerTotal, loading }
}
