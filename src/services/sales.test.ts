import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../mocks/server'
import type { CartItem } from '../types'
import type { ProductosRow } from '../types/database.types'
import { registrarVenta } from './sales'

const SUPABASE_URL = 'https://test.supabase.co'
const IDEMPOTENCY_KEY = '11111111-1111-4111-8111-111111111111'

function createCartItem(quantity = 2): CartItem {
  const product: ProductosRow = {
    id: 'producto-gaseosa',
    codigo_barras: 'TEST-001',
    nombre: 'Gaseosa Inca Kola',
    categoria: 'Bebidas',
    precio_venta: 4,
    costo: 2.5,
    stock_actual: 8,
    stock_minimo: 3,
    created_at: '2026-09-20T12:00:00Z',
  }
  return { product, quantity }
}

describe('registrarVenta', () => {
  it('envía solo producto y cantidad; el precio y total salen del servidor', async () => {
    let payload: Record<string, unknown> | null = null

    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/rpc/registrar_venta_caja`, async ({ request }) => {
        payload = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          venta_id: 'venta-1',
          total: 8,
          idempotency_key: IDEMPOTENCY_KEY,
          items: [
            {
              producto_id: 'producto-gaseosa',
              cantidad: 2,
              precio_unitario: 4,
              subtotal: 8,
            },
          ],
        })
      }),
    )

    const result = await registrarVenta(
      [createCartItem()],
      'Efectivo',
      IDEMPOTENCY_KEY,
    )

    expect(payload).toEqual({
      p_articulos: [
        {
          producto_id: 'producto-gaseosa',
          cantidad: 2,
        },
      ],
      p_metodo_pago: 'Efectivo',
      p_idempotency_key: IDEMPOTENCY_KEY,
    })
    expect(payload).not.toHaveProperty('p_total')
    expect(result.total).toBe(8)
    expect(result.items[0]?.precio_unitario).toBe(4)
  })
})
