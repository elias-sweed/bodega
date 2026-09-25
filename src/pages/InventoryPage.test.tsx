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
    screen.getByPlaceholderText('Escribe o busca una categoría…'),
    'Snacks',
  )
  await user.type(screen.getByLabelText('¿En cuánto lo vendes?'), '2.50')
  await user.type(screen.getByLabelText('Costo por unidad (opcional)'), '1.20')
  await user.type(screen.getByLabelText('¿Cuántos deben quedar para avisarte?'), '2')
  const stockInput = screen.getByLabelText('¿Cuántas unidades hay ahorita? (opcional)')
  await user.clear(stockInput)
  await user.type(stockInput, '10')
}

describe('InventoryPage', () => {
  beforeEach(() => {
    authState.role = 'admin'
    window.sessionStorage.clear()
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

  it('crea un producto sin costo y lo marca como pendiente', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
    await user.type(screen.getByPlaceholderText('Ej. Inca Kola sin azúcar 500ml'), 'Producto Sin Costo')
    await user.type(
      screen.getByPlaceholderText('Escribe o busca una categoría…'),
      'General',
    )
    await user.type(screen.getByLabelText('¿En cuánto lo vendes?'), '3.00')
    await user.type(screen.getByLabelText('¿Cuántas unidades hay ahorita? (opcional)'), '2')
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))

    await waitFor(() => expect(mockState.createCalls).toBe(1))
    expect(mockState.products.find((item) => item.nombre === 'Producto Sin Costo')).toMatchObject({
      costo: 0,
      stock_actual: 2,
    })
    expect(await screen.findByText('Costo pendiente')).toBeInTheDocument()
  })

  it('permite editar el precio de venta dejando el costo pendiente', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    const costInput = screen.getByLabelText('Costo por unidad (opcional)')
    await user.clear(costInput)
    const salePriceInput = screen.getByLabelText('¿En cuánto lo vendes?')
    await user.clear(salePriceInput)
    await user.type(salePriceInput, '4.50')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(mockState.products[0]?.precio_venta).toBe(4.5))
    expect(mockState.products[0]?.costo).toBe(0)
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

  it('filtra las categorías al escribir en la carga de inventario inicial', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getByRole('button', { name: 'Cargar inventario inicial' }))
    await user.click(screen.getByRole('button', { name: 'Agregar producto nuevo' }))

    const categoriaInput = screen.getByLabelText('Categoría') as HTMLInputElement
    await user.type(categoriaInput, 'Lact')
    await user.click(screen.getByRole('button', { name: 'Lácteos' }))
    expect(categoriaInput.value).toBe('Lácteos')
  })

  it('muestra en "Recientes" lo creado en esta sesión aunque la DB tenga fecha vieja', async () => {
    mockState.createWithOldTimestamp = true
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await fillNewProduct(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    expect(await screen.findByText('Galleta Test')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Recientes' }))
    expect(screen.getByText('Galleta Test')).toBeInTheDocument()
  })

  it('salta y marca la fila del producto recién creado', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await fillNewProduct(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    expect(await screen.findByText('Galleta Test')).toBeInTheDocument()

    const row = screen.getByText('Galleta Test').closest('tr')
    await waitFor(() => expect(row).toHaveClass('flash-row'))
  })

  it('marca en "Recientes" aunque la RPC no devuelva el id del producto', async () => {
    mockState.createReturnsEmptyRow = true
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await fillNewProduct(user)
    await user.click(screen.getByRole('button', { name: 'Guardar producto' }))
    expect(await screen.findByText('Galleta Test')).toBeInTheDocument()

    const row = screen.getByText('Galleta Test').closest('tr')
    await waitFor(() => expect(row).toHaveClass('flash-row'))

    await user.click(screen.getByRole('button', { name: 'Recientes' }))
    expect(screen.getByText('Galleta Test')).toBeInTheDocument()
  })

  it('marca y deja en "Recientes" los productos nuevos cargados como inventario inicial', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getByRole('button', { name: 'Cargar inventario inicial' }))
    await user.click(screen.getByRole('button', { name: 'Agregar producto nuevo' }))
    await user.type(screen.getByLabelText('Nombre del producto'), 'Agua de prueba')
    await user.type(screen.getByLabelText('Categoría'), 'Bebidas')
    await user.type(screen.getByLabelText('Unidades que tienes'), '3')
    await user.type(screen.getByLabelText('Precio de venta (S/)'), '2.50')
    await user.click(screen.getByRole('button', { name: 'Guardar inventario inicial' }))

    expect(await screen.findByText('Agua De Prueba')).toBeInTheDocument()
    const row = screen.getByText('Agua De Prueba').closest('tr')
    await waitFor(() => expect(row).toHaveClass('flash-row'))

    await user.click(screen.getByRole('button', { name: 'Recientes' }))
    expect(screen.getByText('Agua De Prueba')).toBeInTheDocument()
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

  it('vuelve a habilitar el botón cuando la RPC de ajuste falla', async () => {
    mockState.adjustFailure = 'Fallo de prueba'
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getAllByTitle('Ajustar stock')[0])
    const stockInput = screen.getByLabelText('Nuevo stock')
    await user.clear(stockInput)
    await user.type(stockInput, '5')
    await user.click(screen.getByRole('button', { name: 'Ajustar stock' }))

    expect(await screen.findByText('No se pudo ajustar el stock. Inténtalo de nuevo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajustar stock' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Guardando…' })).not.toBeInTheDocument()
  })

  it('al editar un producto no se puede cambiar el stock', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    expect(screen.queryByLabelText('¿Cuántas unidades hay ahorita? (opcional)')).not.toBeInTheDocument()
    expect(
      screen.getByText((_content, element) => {
        return (
          element?.tagName.toLowerCase() === 'p' &&
          element.textContent?.includes('Para cambiar el stock usa el botón') === true
        )
      }),
    ).toBeInTheDocument()

    const button = screen.getByRole('button', { name: 'Guardar cambios' })
    expect(button).toBeInTheDocument()
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

  it('filtra las categorías existentes al escribir y permite elegirlas', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
    const categoriaInput = screen.getByPlaceholderText('Escribe o busca una categoría…')

    await user.type(categoriaInput, 'Lact')
    const sugerencias = screen.getAllByRole('button', { name: 'Lácteos' })
    expect(sugerencias.length).toBeGreaterThan(1)
    await user.click(sugerencias[sugerencias.length - 1])

    expect((categoriaInput as HTMLInputElement).value).toBe('Lácteos')
    expect(screen.getAllByRole('button', { name: 'Lácteos' })).toHaveLength(1)
  })

  it('avisa sin coincidencias al buscar una categoría inexistente', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
    const categoriaInput = screen.getByPlaceholderText('Escribe o busca una categoría…')

    await user.type(categoriaInput, 'Zzz')
    expect(screen.getByText(/Sin coincidencias/)).toBeInTheDocument()
  })

  it('recomienda una categoría al escribir el nombre y permite usarla', async () => {
    const user = userEvent.setup()
    renderInventory()
    await screen.findByText('Gaseosa Inca Kola')

    await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
    await user.type(
      screen.getByPlaceholderText('Ej. Inca Kola sin azúcar 500ml'),
      'Inca Kola',
    )

    const banner = screen.getByText(/Parece ser:/)
    expect(banner.textContent).toContain('Bebidas')
    await user.click(screen.getByRole('button', { name: 'Usar' }))

    const categoriaInput = screen.getByPlaceholderText(
      'Escribe o busca una categoría…',
    ) as HTMLInputElement
    expect(categoriaInput.value).toBe('Bebidas')
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
