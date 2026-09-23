import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'

const PALABRAS_PERDIDA = [
  'consumo interno',
  'vencido',
  'dañado',
  'roto',
  'merma',
]

export function esMotivoPerdida(motivo: string | null): boolean {
  const m = (motivo ?? '').toLowerCase()
  return PALABRAS_PERDIDA.some((palabra) => m.includes(palabra))
}

export function etiquetaMotivoPerdida(motivo: string | null): string {
  const m = (motivo ?? '').toLowerCase()
  if (m.includes('consumo interno')) return 'Consumo interno'
  if (m.includes('vencido')) return 'Producto vencido'
  if (m.includes('dañado') || m.includes('roto')) return 'Producto dañado / roto'
  if (m.includes('merma')) return 'Merma'
  const limpio = (motivo ?? '').trim()
  return limpio || 'Pérdida'
}

export interface VentasPorMetodo {
  metodo: string
  total: number
  numero: number
}

export interface PerdidaPorMotivo {
  motivo: string
  total: number
  numero: number
}

export interface ReporteMensual {
  totalVentas: number
  numeroVentas: number
  ventasPorMetodo: VentasPorMetodo[]
  cogs: number
  gananciaBruta: number
  comprasMes: number
  numeroComprasMes: number
  perdidasTotales: number
  numeroPerdidas: number
  perdidasPorMotivo: PerdidaPorMotivo[]
  gananciaLiquida: number
}

const METODOS_PREFERIDOS = ['Efectivo', 'Yape', 'Plin']

function redondear(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcularReporteMensual(
  ventas: VentasRow[],
  detalles: DetalleVentasRow[],
  ingresos: IngresosMercaderiaRow[],
  costoProductos: Map<string, number>,
): ReporteMensual {
  const totalVentas = ventas.reduce((sum, venta) => sum + venta.total, 0)

  const cogs = detalles.reduce(
    (sum, fila) =>
      sum +
      fila.cantidad *
        (fila.costo_unitario ?? costoProductos.get(fila.producto_id ?? '') ?? 0),
    0,
  )

  const metodoMap = new Map<string, VentasPorMetodo>()
  for (const venta of ventas) {
    const metodo = (venta.metodo_pago ?? '').trim() || 'Otros'
    const actual = metodoMap.get(metodo) ?? { metodo, total: 0, numero: 0 }
    actual.total += venta.total
    actual.numero += 1
    metodoMap.set(metodo, actual)
  }
  const ventasPorMetodo = Array.from(metodoMap.values()).sort((a, b) => {
    const ia = METODOS_PREFERIDOS.indexOf(a.metodo)
    const ib = METODOS_PREFERIDOS.indexOf(b.metodo)
    if (ia === -1 && ib === -1) return a.metodo.localeCompare(b.metodo, 'es')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  let comprasMes = 0
  let numeroComprasMes = 0
  let perdidasTotales = 0
  let numeroPerdidas = 0
  const perdidaMap = new Map<string, PerdidaPorMotivo>()

  for (const fila of ingresos) {
    if (esMotivoPerdida(fila.motivo)) {
      let valor = Math.abs((fila.cantidad ?? 0) * (fila.costo_unitario ?? 0))
      if (valor === 0) valor = Math.abs(fila.costo_total ?? 0)
      perdidasTotales += valor
      numeroPerdidas += 1

      const etiqueta = etiquetaMotivoPerdida(fila.motivo)
      const actual = perdidaMap.get(etiqueta) ?? { motivo: etiqueta, total: 0, numero: 0 }
      actual.total += valor
      actual.numero += 1
      perdidaMap.set(etiqueta, actual)
    } else {
      comprasMes += fila.costo_total ?? 0
      numeroComprasMes += 1
    }
  }

  const perdidasPorMotivo = Array.from(perdidaMap.values()).sort(
    (a, b) => b.total - a.total,
  )

  return {
    totalVentas: redondear(totalVentas),
    numeroVentas: ventas.length,
    ventasPorMetodo: ventasPorMetodo.map((m) => ({
      ...m,
      total: redondear(m.total),
    })),
    cogs: redondear(cogs),
    gananciaBruta: redondear(totalVentas - cogs),
    comprasMes: redondear(comprasMes),
    numeroComprasMes,
    perdidasTotales: redondear(perdidasTotales),
    numeroPerdidas,
    perdidasPorMotivo: perdidasPorMotivo.map((p) => ({
      ...p,
      total: redondear(p.total),
    })),
    gananciaLiquida: redondear(totalVentas - comprasMes - perdidasTotales),
  }
}