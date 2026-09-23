import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'

const PALABRAS_PERDIDA = ['consumo interno', 'vencido', 'dañado', 'roto', 'merma']
const PALABRAS_AJUSTE = ['correccion', 'ajuste', 'regalo', 'bonificacion', 'sobrante']

function normalizar(value: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function esMotivoPerdida(motivo: string | null): boolean {
  const value = normalizar(motivo)
  return value !== '' && PALABRAS_PERDIDA.some((palabra) => value.includes(normalizar(palabra)))
}

export function etiquetaMotivoPerdida(motivo: string | null): string {
  const value = normalizar(motivo)
  if (value.includes('consumo interno')) return 'Consumo interno'
  if (value.includes('vencido')) return 'Producto vencido'
  if (value.includes('danado') || value.includes('roto')) return 'Producto dañado / roto'
  if (value.includes('merma')) return 'Merma'
  return motivo?.trim() || 'Pérdida'
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

export interface ProductoVendido {
  nombre: string
  cantidad: number
  cobrado: number
  ganancia: number
}

export interface ReporteMensual {
  totalVentas: number
  numeroVentas: number
  ventasPorMetodo: VentasPorMetodo[]
  cogs: number
  gananciaEstimada: number
  comprasMes: number
  numeroComprasMes: number
  perdidasTotales: number
  numeroPerdidas: number
  perdidasPorMotivo: PerdidaPorMotivo[]
  productosMasVendidos: ProductoVendido[]
}

const METODOS_PREFERIDOS = ['Efectivo', 'Yape', 'Plin']

function redondear(value: number): number {
  return Math.round(value * 100) / 100
}

function esAjuste(fila: IngresosMercaderiaRow): boolean {
  const motivo = normalizar(fila.motivo)
  const proveedor = normalizar(fila.nombre_proveedor)
  return PALABRAS_AJUSTE.some((palabra) => motivo.includes(palabra) || proveedor.includes(palabra))
}

export function calcularReporteMensual(
  ventas: VentasRow[],
  detalles: DetalleVentasRow[],
  ingresos: IngresosMercaderiaRow[],
  productos: Map<string, { nombre: string; costo: number }>,
): ReporteMensual {
  const totalVentas = ventas.reduce((sum, venta) => sum + venta.total, 0)
  const porProducto = new Map<string, ProductoVendido>()

  const cogs = detalles.reduce((sum, fila) => {
    const productoId = fila.producto_id ?? ''
    const costoUnitario =
      fila.costo_unitario ?? productos.get(productoId)?.costo ?? 0
    const costo = costoUnitario * fila.cantidad
    const nombre = productos.get(productoId)?.nombre ?? 'Producto eliminado'
    const id = productoId || `eliminado:${nombre}:${fila.id}`
    const actual = porProducto.get(id) ?? {
      nombre,
      cantidad: 0,
      cobrado: 0,
      ganancia: 0,
    }
    actual.cantidad += fila.cantidad
    actual.cobrado += fila.subtotal
    actual.ganancia += fila.subtotal - costo
    porProducto.set(id, actual)
    return sum + costo
  }, 0)

  const metodoMap = new Map<string, VentasPorMetodo>()
  for (const venta of ventas) {
    const metodo = venta.metodo_pago?.trim() || 'Otros'
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
      const valor = Math.abs(fila.costo_total)
      perdidasTotales += valor
      numeroPerdidas += 1
      const etiqueta = etiquetaMotivoPerdida(fila.motivo)
      const actual = perdidaMap.get(etiqueta) ?? { motivo: etiqueta, total: 0, numero: 0 }
      actual.total += valor
      actual.numero += 1
      perdidaMap.set(etiqueta, actual)
    } else if (!esAjuste(fila) && fila.cantidad_ingresada > 0) {
      comprasMes += fila.costo_total
      numeroComprasMes += 1
    }
  }

  const productosMasVendidos = Array.from(porProducto.values())
    .sort((a, b) => b.cantidad - a.cantidad || b.cobrado - a.cobrado)
    .slice(0, 10)
    .map((producto) => ({
      ...producto,
      cobrado: redondear(producto.cobrado),
      ganancia: redondear(producto.ganancia),
    }))

  return {
    totalVentas: redondear(totalVentas),
    numeroVentas: ventas.length,
    ventasPorMetodo: ventasPorMetodo.map((metodo) => ({
      ...metodo,
      total: redondear(metodo.total),
    })),
    cogs: redondear(cogs),
    gananciaEstimada: redondear(totalVentas - cogs),
    comprasMes: redondear(comprasMes),
    numeroComprasMes,
    perdidasTotales: redondear(perdidasTotales),
    numeroPerdidas,
    perdidasPorMotivo: Array.from(perdidaMap.values())
      .sort((a, b) => b.total - a.total)
      .map((perdida) => ({ ...perdida, total: redondear(perdida.total) })),
    productosMasVendidos,
  }
}
