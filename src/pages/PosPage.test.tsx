import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { mockState } from '../mocks/handlers'
import { PosPage } from './PosPage'

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'cajero-test', email: 'cajero@test.local' },
    rol: 'cajero',
  }),
}))

function renderPos() {
  return render(
    <MemoryRouter initialEntries={['/caja']}>
      <PosPage />
    </MemoryRouter>,
  )
}

describe('PosPage', () => {
  it('muestra los productos disponibles dentro de su categoría', async () => {
    const user = userEvent.setup()
    renderPos()

    expect(await screen.findByRole('button', { name: 'Bebidas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lácteos' })).toBeInTheDocument()
    expect(screen.queryByText('Gaseosa Inca Kola')).not.toBeInTheDocument()
    expect(screen.queryByText('Productos agotados')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bebidas' }))

    expect(await screen.findByText('Gaseosa Inca Kola')).toBeInTheDocument()
  })

  it('incluye agotados al final de su categoría y conserva la sección global', async () => {
    const user = userEvent.setup()
    const agotado = mockState.products.find((product) => product.id === 'producto-leche')
    if (!agotado) throw new Error('Falta el producto de prueba')
    agotado.stock_actual = 0
    mockState.products.push({
      id: 'producto-leche-disponible',
      codigo_barras: null,
      nombre: 'Leche disponible',
      categoria: 'Lácteos',
      precio_venta: 3.5,
      costo: 2.5,
      stock_actual: 4,
      stock_minimo: 1,
      created_at: '2026-09-20T12:00:00Z',
    })

    renderPos()

    expect(await screen.findByText('Productos agotados')).toBeInTheDocument()
    expect(screen.getByText('Leche de prueba')).toBeInTheDocument()
    expect(screen.getByText('Agotado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lácteos' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lácteos' }))

    const disponible = await screen.findByText('Leche disponible')
    const agotadoEnCategoria = screen.getByText('Leche de prueba')
    expect(
      disponible.compareDocumentPosition(agotadoEnCategoria) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Agregar Leche de prueba al carrito' }),
    ).toBeDisabled()
  })
})
