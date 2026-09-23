import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { mockState } from '../mocks/handlers'
import { PurchasesPage } from './PurchasesPage'

function renderPurchases() {
  return render(
    <MemoryRouter initialEntries={['/compras']}>
      <PurchasesPage />
    </MemoryRouter>,
  )
}

async function addGaseosa(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Agregar producto del inventario'), 'Gaseosa')
  const productOption = await screen.findByRole('button', {
    name: /Gaseosa Inca Kola.*stock:\s*8/i,
  })
  await user.click(productOption)
  await user.type(
    screen.getByLabelText('Unidades que llegaron de Gaseosa Inca Kola'),
    '20',
  )
  await user.type(
    screen.getByLabelText('Costo total pagado por Gaseosa Inca Kola'),
    '60',
  )
}

describe('PurchasesPage', () => {
  it('muestra el estado de carga y después permite preparar una compra', async () => {
    mockState.providerDelayMs = 80
    renderPurchases()

    expect(screen.getByLabelText('Cargando compras')).toBeInTheDocument()
    expect(await screen.findByText('Datos de la compra')).toBeInTheDocument()
    expect(screen.getByText('¿Qué productos llegaron?')).toBeInTheDocument()
  })

  it('registra una compra atómica y actualiza el stock simulado', async () => {
    const user = userEvent.setup()
    renderPurchases()
    await screen.findByText('Datos de la compra')

    await user.selectOptions(
      screen.getByLabelText('¿Quién trajo la mercadería?'),
      'proveedor-1',
    )
    await addGaseosa(user)
    await user.click(screen.getByRole('button', { name: 'Guardar compra' }))

    await waitFor(() => expect(mockState.purchaseKeys).toHaveLength(1))
    expect(mockState.lastPurchasePayload).toEqual({
      p_proveedor_id: 'proveedor-1',
      p_nombre_proveedor: 'Distribuidora Centro',
      p_comprobante: null,
      p_items: [
        {
          producto_id: 'producto-gaseosa',
          cantidad: 20,
          costo_total: 60,
        },
      ],
      p_idempotency_key: expect.any(String),
    })
    const gaseous = mockState.products.find((item) => item.id === 'producto-gaseosa')
    expect(gaseous).toMatchObject({
      stock_actual: 28,
      costo: 2.86,
    })
    expect(mockState.incomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          producto_id: 'producto-gaseosa',
          cantidad_ingresada: 20,
          costo_total: 60,
          nombre_proveedor: 'Distribuidora Centro',
        }),
      ]),
    )
    expect(await screen.findByText(/Se sumó al inventario/)).toBeInTheDocument()
  })

  it('no duplica la compra cuando se pulsa dos veces Guardar', async () => {
    const user = userEvent.setup()
    renderPurchases()
    await screen.findByText('Datos de la compra')
    await addGaseosa(user)

    const saveButton = screen.getByRole('button', { name: 'Guardar compra' })
    await user.dblClick(saveButton)

    await waitFor(() => expect(mockState.purchaseKeys).toHaveLength(1))
    expect(mockState.incomes).toHaveLength(1)
  })

  it('muestra un error entendible cuando la RPC rechaza la compra', async () => {
    mockState.purchaseFailure = 'Stock o datos inválidos'
    const user = userEvent.setup()
    renderPurchases()
    await screen.findByText('Datos de la compra')
    await addGaseosa(user)

    await user.click(screen.getByRole('button', { name: 'Guardar compra' }))

    expect(
      await screen.findByText('No se pudo registrar la compra. Inténtalo de nuevo.'),
    ).toBeInTheDocument()
    expect(mockState.purchaseCalls).toBe(1)
  })

  it('crea un proveedor y lo selecciona automáticamente', async () => {
    const user = userEvent.setup()
    renderPurchases()
    await screen.findByText('Datos de la compra')

    await user.click(screen.getByRole('button', { name: 'Registrar un proveedor nuevo' }))
    await user.type(screen.getByLabelText('Nombre del proveedor'), 'Proveedor Nuevo')
    await user.type(screen.getByLabelText('Empresa (opcional)'), 'Comercial Nueva')
    await user.click(screen.getByRole('button', { name: 'Guardar y usar este proveedor' }))

    await waitFor(() => expect(mockState.providers).toHaveLength(2))
    expect(screen.getByLabelText('¿Quién trajo la mercadería?')).toHaveValue(
      'proveedor-2',
    )
  })
})
