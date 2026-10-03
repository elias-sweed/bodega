/**
 * Cola local de ventas pendientes de sincronizar.
 *
 * Cuando no hay internet, la venta NUNCA se pierde: se guarda en el
 * navegador (IndexedDB) y se sincroniza sola cuando vuelva la señal.
 * Cada venta trae su propia clave de idempotencia para que, al subirse,
 * Supabase pueda evitar duplicados si se reintenta.
 */

const DB_NAME = 'bodega_offline'
const DB_VERSION = 1
const STORE = 'pending_sales'

export type PendingSaleItem = {
  productoId: string
  nombre: string
  cantidad: number
  precioUnitario: number
}

export type PendingSale = {
  idempotencyKey: string
  metodoPago: string
  items: PendingSaleItem[]
  total: number
  createdAt: string
}

function assertValidSale(sale: PendingSale): void {
  if (!sale.idempotencyKey || typeof sale.idempotencyKey !== 'string') {
    throw new Error('Venta offline inválida: falta la clave de idempotencia.')
  }
  if (!sale.metodoPago || typeof sale.metodoPago !== 'string') {
    throw new Error('Venta offline inválida: falta el método de pago.')
  }
  if (!Array.isArray(sale.items) || sale.items.length === 0) {
    throw new Error('Venta offline inválida: no tiene productos.')
  }
  for (const item of sale.items) {
    if (!item.productoId || typeof item.productoId !== 'string') {
      throw new Error('Venta offline inválida: producto sin id.')
    }
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      throw new Error(`Venta offline inválida: cantidad inválida en «${item.nombre}».`)
    }
    if (typeof item.precioUnitario !== 'number' || item.precioUnitario < 0) {
      throw new Error(`Venta offline inválida: precio inválido en «${item.nombre}».`)
    }
  }
  if (typeof sale.total !== 'number' || sale.total < 0) {
    throw new Error('Venta offline inválida: total inválido.')
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'idempotencyKey' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('No se pudo abrir la base offline.'))
  })
}

function runTx<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = action(tx.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () =>
          reject(request.error ?? new Error('Error de almacenamiento offline.'))
        tx.oncomplete = () => db.close()
        tx.onerror = () => db.close()
        tx.onabort = () => db.close()
      }),
  )
}

export async function addPendingSale(sale: PendingSale): Promise<void> {
  assertValidSale(sale)
  await runTx('readwrite', (store) => store.put(sale))
}

export function listPendingSales(): Promise<PendingSale[]> {
  return runTx('readonly', (store) => store.getAll() as IDBRequest<PendingSale[]>)
}

export async function countPendingSales(): Promise<number> {
  const all = await listPendingSales()
  return all.length
}

export async function removePendingSale(idempotencyKey: string): Promise<void> {
  if (!idempotencyKey) return
  await runTx('readwrite', (store) => store.delete(idempotencyKey))
}

/** true cuando el dispositivo perdió la conexión a internet. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** Detecta errores típicos de red (fetch fallido) de Supabase/navegador. */
export function isNetworkError(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false
  if (cause instanceof TypeError) return true
  const msg = cause.message.toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('fetch')
  )
}
