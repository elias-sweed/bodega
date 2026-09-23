import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockState } from '../mocks/handlers'
import { InventoryPage } from './InventoryPage'

const authState = vi.hoisted(() => ({ role: 'admin' as 'admin' | 'cajero' }))

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    rol: authState.role,
    user: { id: 'usuario-test', email: 'usuario@test.local' },
    signOut: vi.fn(),
  }),
}))

function renderInventory() {
  return render(
    <MemoryRouter initialEntries={['/inventario']}>
      <InventoryPage />
    </MemoryRouter>,
  )
}

async function fillNewProduct(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
  await user.type(screen.getByPlaceholderText('Ej. Inca Kola sin azúcar 500ml'), 'Galleta Test')
  await user.type(
    screen.getByPlaceholderText('Si no encuentra la tuya, escríbela aquí'),
    'Snacks',
  )
  await user.type(screen.getByLabelText('¿En cuánto lo vendes?'), '2.50')
  await user.type(screen.getByLabelText('¿Cuánto te cuesta cada uno?'), '1.20')
  await user.type(screen.getByLabelText('¿Cuántos deben quedar para avisarte?'), '2')
  const stockInput = screen.getByLabelText('¿Cuántas unidades hay ahorita?')
  await user.clear(stockInput)
  await user.type(stockInput, '10')
}

describe('InventoryPage', () => {
  beforeEach(() => {
    authState.role = 'admin'
  })

  it('muestra el estado de carga y luego lista los productos', async () => {
    mockState.productDelayMs = 80
    renderInventory()

    expect(screen.getByLabelText('Cargando inventario')).toBeInTheDocument()
    expect(await screen.findByText('Gaseosa Inca Kola')).toBeInTheDocument()
    expect(screen.getByText('Leche De Prueba')).toBeInTheDocument()
    expect(screen.getByText('1 con stock bajo')).toBeInTheDocument()
  })

  it('crea un producto con stock inicial mediante la RPC simulada', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await fillNewProduct(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    await waitFor(() => expect(mockState.productLookupCalls).toBe(1))
    await waitFor(() => expect(mockState.createCalls).toBe(1))
    expect(await screen.findByText('Galleta Test')).toBeInTheDocument()
    expect(mockState.products.find((item) => item.nombre === 'Galleta Test')).toMatchObject({
      stock_actual: 10,
      precio_venta: 2.5,
      costo: 1.2,
    })
    expect(mockState.incomes.some((item) => item.motivo === 'Stock inicial')).toBe(true)
  })

  it('muestra un error entendible cuando Supabase rechaza la creación', async () => {
    mockState.createFailure = 'No se pudo guardar el producto'
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await fillNewProduct(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    expect(
      await screen.findByText('No se pudo crear el producto. Inténtalo de nuevo.'),
    ).toBeInTheDocument()
    expect(mockState.createCalls).toBe(1)
  })

  it('carga varias unidades existentes como inventario inicial', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getByRole('button', { name: 'Cargar inventario inicial' }))
    await user.type(screen.getByLabelText('Buscar producto'), 'Gaseosa')
    await user.click(
      screen.getByRole('button', { name: 'Agregar Gaseosa Inca Kola al inventario inicial' }),
    )
    await user.type(
      screen.getByLabelText('Unidades que tienes de Gaseosa Inca Kola'),
      '3',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar inventario inicial' }))

    await waitFor(() => expect(mockState.initialInventoryCalls).toBe(1))
    expect(mockState.products.find((item) => item.id === 'producto-gaseosa')).toMatchObject({
      stock_actual: 3,
    })
    expect(mockState.incomes.some((item) => item.motivo === 'Stock inicial')).toBe(true)
    expect(await screen.findByText(/Inventario inicial guardado: 1 producto y 3 unidades/)).toBeInTheDocument()
  })

  it('crea un producto nuevo dentro de la carga de inventario inicial', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getByRole('button', { name: 'Cargar inventario inicial' }))
    await user.click(screen.getByRole('button', { name: 'Agregar producto nuevo' }))
    expect(screen.queryByLabelText('Costo por unidad (S/)')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Nombre del producto'), 'Agua de prueba')
    await user.type(screen.getByLabelText('Categoría'), 'Bebidas')
    await user.type(screen.getByLabelText('Unidades que tienes'), '3')
    await user.type(screen.getByLabelText('Precio de venta (S/)'), '2.50')
    await user.click(screen.getByRole('button', { name: 'Guardar inventario inicial' }))

    await waitFor(() => expect(mockState.initialInventoryCalls).toBe(1))
    expect(mockState.lastInitialInventoryPayload).toEqual([
      {
        tipo: 'nuevo',
        nombre: 'Agua De Prueba',
        categoria: 'Bebidas',
        codigo_barras: null,
        precio_venta: 2.5,
        stock_minimo: 5,
        cantidad: 3,
      },
    ])
    expect(mockState.products.find((item) => item.nombre === 'Agua De Prueba')).toMatchObject({
      stock_actual: 3,
      precio_venta: 2.5,
      costo: 0,
    })
  })

  it('ajusta stock usando la única RPC transaccional', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getAllByTitle('Ajustar stock')[0])
    const stockInput = screen.getByLabelText('Nuevo stock')
    await user.clear(stockInput)
    await user.type(stockInput, '5')
    await user.click(screen.getByRole('button', { name: 'Ajustar stock' }))

    await waitFor(() => expect(mockState.adjustCalls).toBe(1))
    expect(await screen.findByText(/Stock de "Gaseosa Inca Kola" ajustado a 5/)).toBeInTheDocument()
  })

  it('oculta acciones administrativas a un cajero', async () => {
    authState.role = 'cajero'
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    expect(screen.queryByRole('button', { name: 'Nuevo producto' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cargar inventario inicial' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByTitle('Ajustar stock')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Movimientos' })).toHaveLength(2)
  })

  it('muestra un estado de error si falla la carga del catálogo', async () => {
    mockState.productFailures = 1
    renderInventory()

    expect(
      await screen.findAllByText('No se pudieron cargar los productos'),
    ).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
