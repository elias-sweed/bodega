import type { IngresosMercaderiaRow } from '../../types/database.types'
import { fechaEnRango, formatFechaCorta, shortId, enFranja } from '../../utils/format'
import type { HistoryFilter } from './types'

export interface CompraGroup {
  key: string
  proveedorId: string | null
  nombreProveedor: string | null
  comprobante: string | null
  fecha: string
  total: number
  items: IngresosMercaderiaRow[]
}

const PALABRAS_AJUSTE = [
  'correccion',
  'ajuste',
  'merma',
  'regalo',
  'consumo',
  'sobrante',
  'bonificacion',
]

const PALABRAS_MOTIVO = [
  'correccion',
  'consumo',
  'regalo',
  'bonificacion',
  'merma',
  'vencido',
  'danado',
  'roto',
  'sobrante',
  'ajuste',
]

const CONCEPTO_PROVEEDOR_VARIOS = 'proveedor varios / sin comprobante'

function sinAcentos(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Decide si un ingreso es un AJUSTE MANUAL de inventario y no una compra.
 * Es una lista blanca de orígenes: solo se muestran como ajuste los registros
 * cuyo concepto es uno de los manuales ("Corrección de inventario",
 * "Consumo interno", "Merma", "Sobrante", "Regalo / Bonificación", "Ajuste
 * Manual…") o cuya cantidad es negativa (salida).
 * "Proveedor Varios / Sin Comprobante" SIEMPRE se trata como compra.
 */
export function esAjusteIngreso(item: IngresosMercaderiaRow): boolean {
  if (item.cantidad_ingresada < 0) return true
  if ((item.cantidad_ingresada ?? 0) < 0) return true
  const motivo = sinAcentos((item.motivo ?? '').trim().toLowerCase())
  if (PALABRAS_MOTIVO.some((palabra) => motivo.includes(palabra))) return true
  const nombre = sinAcentos(
    (item.nombre_proveedor ?? '').trim().toLowerCase(),
  )
  if (nombre === '' || nombre === CONCEPTO_PROVEEDOR_VARIOS) return false
  return PALABRAS_AJUSTE.some((palabra) => nombre.includes(palabra))
}

export function fechaDeIngreso(item: IngresosMercaderiaRow): string {
  return item.created_at ?? item.fecha ?? ''
}

export function proveedorDeCompra(
  compra: CompraGroup,
  proveedorMap: Record<string, string>,
): string {
  if (compra.nombreProveedor) return compra.nombreProveedor
  const delCatalogo = proveedorMap[compra.proveedorId ?? '']
  if (delCatalogo) return delCatalogo
  return compra.proveedorId === null
    ? 'Proveedor Varios / Sin Comprobante'
    : 'Proveedor eliminado'
}

export function groupByCompra(ingresos: IngresosMercaderiaRow[]): CompraGroup[] {
  const groups = new Map<string, IngresosMercaderiaRow[]>()
  for (const ingreso of ingresos) {
    const key = ingreso.compra_id ?? ingreso.id
    const current = groups.get(key)
    if (current) {
      current.push(ingreso)
    } else {
      groups.set(key, [ingreso])
    }
  }

  const compras: CompraGroup[] = []
  for (const [key, items] of groups) {
    items.sort((a, b) => fechaDeIngreso(a).localeCompare(fechaDeIngreso(b)))
    compras.push({
      key,
      proveedorId: items.find((item) => item.proveedor_id)?.proveedor_id ?? null,
      nombreProveedor:
        items.find((item) => item.nombre_proveedor)?.nombre_proveedor ?? null,
      comprobante: items.find((item) => item.comprobante)?.comprobante ?? null,
      fecha: fechaDeIngreso(items[0]) || items[0].fecha,
      total: items.reduce((sum, item) => sum + item.costo_total, 0),
      items,
    })
  }

  return compras.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export function matchesCompraFilter(
  compra: CompraGroup,
  proveedorMap: Record<string, string>,
  filter: HistoryFilter,
  numero: number,
): boolean {
  if (!fechaEnRango(compra.fecha, filter.from, filter.to)) return false
  if (!enFranja(compra.fecha, filter.franja)) return false
  const query = filter.query.trim().toLowerCase()
  if (query === '') return true
  const proveedor = proveedorDeCompra(compra, proveedorMap)
  return (
    proveedor.toLowerCase().includes(query) ||
    (compra.comprobante ?? '').toLowerCase().includes(query) ||
    shortId(compra.key).includes(query) ||
    formatFechaCorta(compra.fecha).includes(query) ||
    String(numero) === query
  )
}