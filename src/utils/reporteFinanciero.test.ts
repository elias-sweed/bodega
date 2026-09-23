import { describe, expect, it } from 'vitest'
import type {
  DetalleVentasRow,
  IngresosMercaderiaRow,
  VentasRow,
} from '../types/database.types'
import { calcularReporteMensual } from './reporteFinanciero'

const ventas: VentasRow[] = [
  {
    id: 'venta-1',
    fecha: '2026-09-23T15:00:00Z',
    total: 20,
    metodo_pago: 'Efectivo',
    origen: 'sistema',
    ticket_externo: null,
    idempotency_key: 'key-1',
    creado_por: 'admin@example.com',
  },
]

const detalles: DetalleVentasRow[] = [
  {
    id: 'detalle-1',
    venta_id: 'venta-1',
    producto_id: 'producto-1',
    cantidad: 2,
    precio_unitario: 10,
    subtotal: 20,
    costo_unitario: 2.5,
  },
]

const ingresos: IngresosMercaderiaRow[] = [
  {
    id: 'ingreso-1',
    compra_id: 'compra-1',
    proveedor_id: 'proveedor-1',
    nombre_proveedor: 'Proveedor de prueba',
    producto_id: 'producto-1',
    cantidad_ingresada: 20,
    costo_total: 40,
    comprobante: 'F-001',
    motivo: null,
    fecha: '2026-09-23T16:00:00Z',
    creado_por: 'admin@example.com',
  },
  {
    id: 'ingreso-2',
    compra_id: null,
    proveedor_id: null,
    nombre_proveedor: 'Ajuste Manual de Inventario',
    producto_id: 'producto-1',
    cantidad_ingresada: -1,
    costo_total: -2.5,
    comprobante: null,
    motivo: 'Producto vencido',
    fecha: '2026-09-23T17:00:00Z',
    creado_por: 'admin@example.com',
  },
]

describe('calcularReporteMensual', () => {
  it('calcula ganancia estimada sin restar compras como si fueran pérdida', () => {
    const reporte = calcularReporteMensual(
      ventas,
      detalles,
      ingresos,
      new Map([['producto-1', { nombre: 'Gaseosa Inca Kola', costo: 2.5 }]]),
    )

    expect(reporte.totalVentas).toBe(20)
    expect(reporte.cogs).toBe(5)
    expect(reporte.gananciaEstimada).toBe(15)
    expect(reporte.comprasMes).toBe(40)
    expect(reporte.perdidasTotales).toBe(2.5)
    expect(reporte.productosMasVendidos[0]).toMatchObject({
      nombre: 'Gaseosa Inca Kola',
      cantidad: 2,
      cobrado: 20,
      ganancia: 15,
    })
  })
})
