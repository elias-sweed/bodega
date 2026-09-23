import type { CartItem } from '../types'
import type {
  RegistrarVentaBackfillResult,
  RegistrarVentaResult,
} from '../types/database.types'
import { getFriendlyError } from '../utils/errors'
import { supabase } from './supabase'

/**
 * Error de venta. Cuando hay problemas de stock, `stockShortIds` trae los ids
 * de los productos que no alcanzaron, para que el carrito NO se pierda y la UI
 * pueda avisar cuáles revisar.
 */
export class VentaError extends Error {
  stockShortIds: string[]
  raw: string | null

  constructor(message: string, stockShortIds: string[] = [], raw: string | null = null) {
    super(message)
    this.name = 'VentaError'
    this.stockShortIds = stockShortIds
    this.raw = raw
  }
}

function isVentaError(value: unknown): value is VentaError {
  return value instanceof VentaError
}

export function getStockShortIds(cause: unknown): string[] {
  return isVentaError(cause) ? cause.stockShortIds : []
}

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export async function registrarVenta(
  items: CartItem[],
  metodoPago: string,
  idempotencyKey: string = crypto.randomUUID(),
): Promise<RegistrarVentaResult> {
  const articulos = items.map((item) => ({
    producto_id: item.product.id,
    cantidad: item.quantity,
  }))

  const { data, error } = await supabase.rpc('registrar_venta_caja', {
    p_articulos: articulos,
    p_metodo_pago: metodoPago,
    p_idempotency_key: idempotencyKey,
  })

  if (error) {
    const raw = error.message
    console.error('Error al registrar la venta:', raw)
    if (raw.toLowerCase().includes('stock insuficiente')) {
      const idMatch = raw.match(UUID_RE)
      const ids = idMatch ? [idMatch[0]] : []
      throw new VentaError(getFriendlyError(error), ids, raw)
    }
    throw new VentaError(
      getFriendlyError(error, 'No se pudo registrar la venta. Inténtalo de nuevo.'),
      [],
      raw,
    )
  }

  return data
}

/**
 * Error del importador offline (backfill). Cuando `duplicate` es true, el
 * ticket ya había sido importado antes y debe omitirse sin alarmar.
 */
export class BackfillError extends Error {
  duplicate: boolean
  raw: string | null

  constructor(message: string, duplicate = false, raw: string | null = null) {
    super(message)
    this.name = 'BackfillError'
    this.duplicate = duplicate
    this.raw = raw
  }
}

export function isDuplicateTicketError(cause: unknown): boolean {
  return cause instanceof BackfillError ? cause.duplicate : false
}

export type BackfillItem = {
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export type { RegistrarVentaBackfillResult }

/**
 * Registra una venta pasada (fecha explícita) usando el precio histórico
 * indicado en el archivo. Requiere la migración final aplicada.
 */
export async function registrarVentaBackfill(
  items: BackfillItem[],
  metodoPago: string,
  fechaISO: string,
  ticket: string,
): Promise<RegistrarVentaBackfillResult> {
  const { data, error } = await supabase.rpc('registrar_venta_backfill', {
    p_articulos: items,
    p_metodo_pago: metodoPago,
    p_fecha: fechaISO,
    p_ticket: ticket,
  })

  if (error) {
    const raw = error.message ?? ''
    console.error('Error al importar la venta offline:', raw)
    if (raw.includes('VENTA_DUPLICADA')) {
      throw new BackfillError(
        `El ticket ${ticket} ya fue importado antes. Se omitió.`,
        true,
        raw,
      )
    }
    throw new BackfillError(
      getFriendlyError(error, 'No se pudo importar la venta. Inténtalo de nuevo.'),
      false,
      raw,
    )
  }

  return data as RegistrarVentaBackfillResult
}