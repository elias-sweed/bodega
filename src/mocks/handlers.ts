import { delay, http, HttpResponse } from 'msw'
import type {
  CargarInventarioInicialItem,
  DetalleVentasRow,
  IngresosMercaderiaRow,
  ProveedoresRow,
  ProductosRow,
  UsuariosAutorizadosRow,
  VentasRow,
} from '../types/database.types'

const SUPABASE_URL = 'https://test.supabase.co'

type MockState = {
  products: ProductosRow[]
  providers: ProveedoresRow[]
  incomes: IngresosMercaderiaRow[]
  sales: VentasRow[]
  saleDetails: DetalleVentasRow[]
  authorizedUsers: UsuariosAutorizadosRow[]
  productFailures: number
  productDelayMs: number
  providerDelayMs: number
  createFailure: string | null
  adjustFailure: string | null
  purchaseFailure: string | null
  initialInventoryFailure: string | null
  /** Al crear un producto, asigna una fecha vieja para simular DB sin created_at útil */
  createWithOldTimestamp: boolean
  /** La RPC de creación responde sin la fila (simula versión vieja del SQL) */
  createReturnsEmptyRow: boolean
  productLookupCalls: number
  createCalls: number
  adjustCalls: number
  purchaseCalls: number
  initialInventoryCalls: number
  purchaseKeys: string[]
  lastPurchasePayload: unknown
  lastInitialInventoryPayload: CargarInventarioInicialItem[] | null
}

const initialProducts: ProductosRow[] = [
  {
    id: 'producto-gaseosa',
    codigo_barras: 'TEST-001',
    nombre: 'Gaseosa Inca Kola',
    categoria: 'Bebidas',
    precio_venta: 4,
    costo: 2.5,
    stock_actual: 8,
    stock_minimo: 3,
    created_at: '2026-09-20T12:00:00Z',
  },
  {
    id: 'producto-leche',
    codigo_barras: null,
    nombre: 'Leche de prueba',
    categoria: 'Lácteos',
    precio_venta: 3,
    costo: 2,
    stock_actual: 2,
    stock_minimo: 3,
    created_at: '2026-09-20T12:00:00Z',
  },
]

const initialProviders: ProveedoresRow[] = [
  {
    id: 'proveedor-1',
    nombre: 'Distribuidora Centro',
    empresa: 'Distribuidora Centro S.A.',
    created_at: '2026-09-20T12:00:00Z',
  },
]

export const mockState: MockState = {
  products: [],
  providers: [],
  incomes: [],
  sales: [],
  saleDetails: [],
  authorizedUsers: [],
  productFailures: 0,
  productDelayMs: 0,
  providerDelayMs: 0,
  createFailure: null,
  adjustFailure: null,
  purchaseFailure: null,
  initialInventoryFailure: null,
  createWithOldTimestamp: false,
  createReturnsEmptyRow: false,
  productLookupCalls: 0,
  createCalls: 0,
  adjustCalls: 0,
  purchaseCalls: 0,
  initialInventoryCalls: 0,
  purchaseKeys: [],
  lastPurchasePayload: null,
  lastInitialInventoryPayload: null,
}

export function resetMockState(): void {
  mockState.products = structuredClone(initialProducts)
  mockState.providers = structuredClone(initialProviders)
  mockState.incomes = []
  mockState.sales = []
  mockState.saleDetails = []
  mockState.authorizedUsers = []
  mockState.productFailures = 0
  mockState.productDelayMs = 0
  mockState.providerDelayMs = 0
  mockState.createFailure = null
  mockState.adjustFailure = null
  mockState.purchaseFailure = null
  mockState.initialInventoryFailure = null
  mockState.createWithOldTimestamp = false
  mockState.createReturnsEmptyRow = false
  mockState.productLookupCalls = 0
  mockState.createCalls = 0
  mockState.adjustCalls = 0
  mockState.purchaseCalls = 0
  mockState.initialInventoryCalls = 0
  mockState.purchaseKeys = []
  mockState.lastPurchasePayload = null
  mockState.lastInitialInventoryPayload = null
}

resetMockState()

function wantsSingleObject(request: Request): boolean {
  return request.headers.get('accept')?.includes('application/vnd.pgrst.object+json') ?? false
}

const productsHandler = http.get(`${SUPABASE_URL}/rest/v1/productos`, async ({ request }) => {
  if (mockState.productFailures > 0) {
    return HttpResponse.json(
      { message: 'No se pudieron cargar los productos' },
      { status: 500 },
    )
  }
  if (mockState.productDelayMs > 0) await delay(mockState.productDelayMs)

  const url = new URL(request.url)
  const rawNameFilter = url.searchParams.get('nombre') ?? url.searchParams.get('name')
  const nameFilter = rawNameFilter?.replace(/^(?:eq|ilike)\./, '')
  const rawIdFilter = url.searchParams.get('id')
  const excludeId = rawIdFilter?.replace(/^neq\./, '')
  if (nameFilter !== undefined) mockState.productLookupCalls += 1
  const selected = nameFilter
    ? mockState.products.filter(
        (product) =>
          product.nombre === nameFilter && (!excludeId || product.id !== excludeId),
      )
    : mockState.products

  if (wantsSingleObject(request)) {
    return selected[0]
      ? HttpResponse.json(selected[0])
      : new HttpResponse(null, { status: 204 })
  }
  return HttpResponse.json(selected)
})

const providersHandler = http.get(
  `${SUPABASE_URL}/rest/v1/proveedores`,
  async () => {
    if (mockState.providerDelayMs > 0) await delay(mockState.providerDelayMs)
    return HttpResponse.json(mockState.providers)
  },
)

const salesHandler = http.get(`${SUPABASE_URL}/rest/v1/ventas`, () => {
  return HttpResponse.json(mockState.sales)
})

const saleDetailsHandler = http.get(
  `${SUPABASE_URL}/rest/v1/detalle_ventas`,
  () => {
    return HttpResponse.json(mockState.saleDetails)
  },
)

const incomesHandler = http.get(
  `${SUPABASE_URL}/rest/v1/ingresos_mercaderia`,
  () => {
    return HttpResponse.json(mockState.incomes)
  },
)

const usersHandler = http.get(
  `${SUPABASE_URL}/rest/v1/usuarios_autorizados`,
  () => {
    return HttpResponse.json(mockState.authorizedUsers)
  },
)

const createProviderHandler = http.post(
  `${SUPABASE_URL}/rest/v1/proveedores`,
  async ({ request }) => {
    const body = (await request.json()) as Partial<ProveedoresRow>
    const provider: ProveedoresRow = {
      id: `proveedor-${mockState.providers.length + 1}`,
      nombre: body.nombre ?? 'Proveedor sin nombre',
      empresa: body.empresa ?? null,
      created_at: new Date().toISOString(),
    }
    mockState.providers.push(provider)
    return HttpResponse.json(provider, { status: 201 })
  },
)

const createProductHandler = http.post(
  `${SUPABASE_URL}/rest/v1/rpc/crear_producto`,
  async ({ request }) => {
    mockState.createCalls += 1
    if (mockState.createFailure) {
      return HttpResponse.json({ message: mockState.createFailure }, { status: 400 })
    }
    const body = (await request.json()) as {
      p_nombre: string
      p_categoria: string
      p_codigo_barras: string | null
      p_precio_venta: number
      p_costo: number
      p_stock_inicial: number
      p_stock_minimo: number
    }
    const product: ProductosRow = {
      id: `producto-${mockState.products.length + 1}`,
      nombre: body.p_nombre,
      categoria: body.p_categoria,
      codigo_barras: body.p_codigo_barras,
      precio_venta: body.p_precio_venta,
      costo: body.p_costo,
      stock_actual: body.p_stock_inicial,
      stock_minimo: body.p_stock_minimo,
      created_at: mockState.createWithOldTimestamp
        ? '2025-01-01T00:00:00Z'
        : new Date().toISOString(),
    }
    mockState.products.push(product)
if (body.p_stock_inicial > 0) {
        mockState.incomes.push({
          id: `ingreso-inicial-${product.id}`,
          compra_id: null,
          proveedor_id: null,
          nombre_proveedor: 'Ajuste Manual de Inventario',
          producto_id: product.id,
          cantidad_ingresada: body.p_stock_inicial,
          costo_total: body.p_stock_inicial * body.p_costo,
          comprobante: null,
          motivo: 'Stock inicial',
          fecha: new Date().toISOString(),
          creado_por: 'admin@test.local',
        })
      }
      if (mockState.createReturnsEmptyRow) {
        return HttpResponse.json({}, { status: 201 })
      }
      return HttpResponse.json(product, { status: 201 })
  },
)

const initialInventoryHandler = http.post(
  `${SUPABASE_URL}/rest/v1/rpc/cargar_inventario_inicial`,
  async ({ request }) => {
    mockState.initialInventoryCalls += 1
    if (mockState.initialInventoryFailure) {
      return HttpResponse.json({ message: mockState.initialInventoryFailure }, { status: 400 })
    }

    const body = (await request.json()) as {
      p_items: CargarInventarioInicialItem[]
    }
    mockState.lastInitialInventoryPayload = body.p_items

    let creados = 0
    let actualizados = 0
    let unidades = 0
    const seenIds = new Set<string>()

    for (const item of body.p_items) {
      unidades += item.cantidad

      if (item.tipo === 'existente') {
        if (seenIds.has(item.producto_id)) {
          return HttpResponse.json({ message: 'Producto duplicado' }, { status: 400 })
        }
        seenIds.add(item.producto_id)
        const product = mockState.products.find((row) => row.id === item.producto_id)
        if (!product) {
          return HttpResponse.json({ message: 'Producto no encontrado' }, { status: 404 })
        }
        if (mockState.incomes.some((income) => income.producto_id === product.id)) {
          return HttpResponse.json(
            { message: 'El producto ya tiene movimientos; usa Ajustar stock' },
            { status: 400 },
          )
        }
        const delta = item.cantidad - product.stock_actual
        product.stock_actual = item.cantidad
        if (delta !== 0) {
          mockState.incomes.push({
            id: `ingreso-inicial-${product.id}-${mockState.initialInventoryCalls}`,
            compra_id: null,
            proveedor_id: null,
            nombre_proveedor: 'Ajuste Manual de Inventario',
            producto_id: product.id,
            cantidad_ingresada: delta,
            costo_total: delta * product.costo,
            comprobante: null,
            motivo: 'Stock inicial',
            fecha: new Date().toISOString(),
            creado_por: 'admin@test.local',
          })
        }
        actualizados += 1
        continue
      }

      if (item.tipo !== 'nuevo') {
        return HttpResponse.json({ message: 'Tipo de producto no válido' }, { status: 400 })
      }
      if (
        mockState.products.some(
          (product) => product.nombre.toLowerCase() === item.nombre.toLowerCase(),
        )
      ) {
        return HttpResponse.json({ message: 'Producto duplicado' }, { status: 400 })
      }

      const product: ProductosRow = {
        id: `producto-inicial-${mockState.products.length + 1}`,
        nombre: item.nombre,
        categoria: item.categoria,
        codigo_barras: item.codigo_barras,
        precio_venta: item.precio_venta,
        costo: 0,
        stock_actual: 0,
        stock_minimo: item.stock_minimo,
        created_at: new Date().toISOString(),
      }
      mockState.products.push(product)
      if (item.cantidad > 0) {
        mockState.incomes.push({
          id: `ingreso-inicial-${product.id}`,
          compra_id: null,
          proveedor_id: null,
          nombre_proveedor: 'Ajuste Manual de Inventario',
          producto_id: product.id,
          cantidad_ingresada: item.cantidad,
          costo_total: 0,
          comprobante: null,
          motivo: 'Stock inicial',
          fecha: new Date().toISOString(),
          creado_por: 'admin@test.local',
        })
      }
      product.stock_actual = item.cantidad
      creados += 1
    }

    return HttpResponse.json({
      productos: creados + actualizados,
      creados,
      actualizados,
      unidades,
    })
  },
)

const adjustProductHandler = http.post(
  `${SUPABASE_URL}/rest/v1/rpc/registrar_ajuste_manual`,
  async ({ request }) => {
    mockState.adjustCalls += 1
    if (mockState.adjustFailure) {
      return HttpResponse.json({ message: mockState.adjustFailure }, { status: 400 })
    }
    const body = (await request.json()) as {
      p_producto_id: string
      p_nuevo_stock: number
      p_motivo: string
    }
    const product = mockState.products.find((item) => item.id === body.p_producto_id)
    if (!product) {
      return HttpResponse.json({ message: 'Producto no encontrado' }, { status: 404 })
    }
    const delta = body.p_nuevo_stock - product.stock_actual
    product.stock_actual = body.p_nuevo_stock
    return HttpResponse.json({
      ingreso_id: `ingreso-ajuste-${mockState.adjustCalls}`,
      stock_actual: product.stock_actual,
      delta,
    })
  },
)

const updateProductHandler = http.post(
  `${SUPABASE_URL}/rest/v1/rpc/actualizar_producto`,
  async ({ request }) => {
    const body = (await request.json()) as {
      p_id: string
      p_nombre: string
      p_categoria: string
      p_precio_venta: number
      p_costo: number
      p_stock_minimo: number
      p_nuevo_stock: number | null
    }
    const product = mockState.products.find((item) => item.id === body.p_id)
    if (!product) {
      return HttpResponse.json({ message: 'Producto no encontrado' }, { status: 404 })
    }
    Object.assign(product, {
      nombre: body.p_nombre,
      categoria: body.p_categoria,
      precio_venta: body.p_precio_venta,
      costo: body.p_costo,
      stock_minimo: body.p_stock_minimo,
      stock_actual: body.p_nuevo_stock ?? product.stock_actual,
    })
    return HttpResponse.json({
      producto_id: product.id,
      stock_actual: product.stock_actual,
      delta: 0,
    })
  },
)

const registerPurchaseHandler = http.post(
  `${SUPABASE_URL}/rest/v1/rpc/registrar_compra`,
  async ({ request }) => {
    mockState.purchaseCalls += 1
    if (mockState.purchaseFailure) {
      return HttpResponse.json({ message: mockState.purchaseFailure }, { status: 400 })
    }
    const body = (await request.json()) as {
      p_proveedor_id: string | null
      p_nombre_proveedor: string | null
      p_comprobante: string | null
      p_items: { producto_id: string; cantidad: number; costo_total: number }[]
      p_idempotency_key: string
    }
    mockState.lastPurchasePayload = body

    if (mockState.purchaseKeys.includes(body.p_idempotency_key)) {
      const previous = mockState.incomes.filter(
        (income) => income.compra_id === body.p_idempotency_key,
      )
      return HttpResponse.json({
        compra_id: body.p_idempotency_key,
        total: previous.reduce((sum, income) => sum + income.costo_total, 0),
        items: previous.length,
      })
    }

    const products = body.p_items.map((item) => {
      const product = mockState.products.find(
        (row) => String(row.id) === String(item.producto_id),
      )
      return { item, product }
    })
    if (products.some((entry) => !entry.product)) {
      return HttpResponse.json(
        { message: 'Producto no encontrado en el inventario simulado' },
        { status: 404 },
      )
    }

    let total = 0
    products.forEach(({ item, product }, index) => {
      if (!product) return
      const previousStock = product.stock_actual
      const unitCost = item.costo_total / item.cantidad
      const nextCost =
        product.costo <= 0
          ? unitCost
          : (product.costo * previousStock + item.costo_total) / (previousStock + item.cantidad)
      product.stock_actual += item.cantidad
      product.costo = Math.round(nextCost * 100) / 100
      total += item.costo_total
      mockState.incomes.push({
        id: `ingreso-compra-${mockState.purchaseCalls}-${index}`,
        compra_id: body.p_idempotency_key,
        proveedor_id: body.p_proveedor_id,
        nombre_proveedor: body.p_nombre_proveedor,
        producto_id: product.id,
        cantidad_ingresada: item.cantidad,
        costo_total: item.costo_total,
        comprobante: body.p_comprobante,
        motivo: null,
        fecha: new Date().toISOString(),
        creado_por: 'admin@test.local',
      })
    })
    mockState.purchaseKeys.push(body.p_idempotency_key)
    return HttpResponse.json({
      compra_id: body.p_idempotency_key,
      total,
      items: body.p_items.length,
    })
  },
)

export const handlers = [
  productsHandler,
  providersHandler,
  salesHandler,
  saleDetailsHandler,
  incomesHandler,
  usersHandler,
  createProviderHandler,
  createProductHandler,
  initialInventoryHandler,
  adjustProductHandler,
  updateProductHandler,
  registerPurchaseHandler,
]
