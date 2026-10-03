/**
 * Respaldo de emergencia: descarga las ventas pendientes como CSV.
 * Si el teléfono se apaga o se cierra todo, ese archivo no se pierde
 * y se puede importar después desde Historial → Importar ventas.
 */
import { listPendingSales } from './offlineQueue'
import { exportCsv } from '../utils/exportCsv'

export async function exportPendingSalesBackup(): Promise<number> {
  const pending = await listPendingSales()
  if (pending.length === 0) return 0

  const rows: (string | number)[][] = [
    [
      'Fecha',
      'Método de pago',
      'Producto',
      'Cantidad',
      'Precio unitario',
      'Subtotal',
      'Total de la venta',
      'Clave única',
    ],
  ]
  for (const sale of pending) {
    for (const item of sale.items) {
      rows.push([
        sale.createdAt,
        sale.metodoPago,
        item.nombre,
        item.cantidad,
        item.precioUnitario,
        item.cantidad * item.precioUnitario,
        sale.total,
        sale.idempotencyKey,
      ])
    }
  }

  const hoy = new Date().toISOString().slice(0, 10)
  exportCsv(rows, `respaldo_ventas_pendientes_${hoy}`)
  return pending.length
}
