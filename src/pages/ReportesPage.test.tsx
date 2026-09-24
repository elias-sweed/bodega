import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockState } from '../mocks/handlers'
import { ReportesPage } from './ReportesPage'
import { fetchVentasMes } from '../services/reportes'

function renderReportes() {
  return render(
    <MemoryRouter initialEntries={['/reportes']}>
      <ReportesPage />
    </MemoryRouter>,
  )
}

describe('ReportesPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('la primera entrada muestra el skeleton y luego el reporte', async () => {
    mockState.sales = [
      {
        id: 'venta-1',
        fecha: new Date().toISOString(),
        total: 50,
        metodo_pago: 'Efectivo',
        origen: 'caja',
        ticket_externo: null,
        idempotency_key: null,
        creado_por: 'admin@test.local',
      },
    ]
    mockState.saleDetails = [
      {
        id: 'detalle-1',
        venta_id: 'venta-1',
        producto_id: 'producto-gaseosa',
        cantidad: 10,
        precio_unitario: 4,
        subtotal: 40,
        costo_unitario: 2.5,
      },
    ]

    renderReportes()

    expect(screen.getByLabelText('Cargando reporte')).toBeInTheDocument()
    await screen.findByText('Ventas cobradas')
    expect(screen.getByText('S/ 50.00')).toBeInTheDocument()
  })

  it('la segunda entrada carga directo desde caché, sin skeleton', async () => {
    mockState.sales = [
      {
        id: 'venta-1',
        fecha: new Date().toISOString(),
        total: 50,
        metodo_pago: 'Efectivo',
        origen: 'caja',
        ticket_externo: null,
        idempotency_key: null,
        creado_por: 'admin@test.local',
      },
    ]
    mockState.saleDetails = [
      {
        id: 'detalle-1',
        venta_id: 'venta-1',
        producto_id: 'producto-gaseosa',
        cantidad: 10,
        precio_unitario: 4,
        subtotal: 40,
        costo_unitario: 2.5,
      },
    ]

    const fetchSpy = vi.spyOn({ fetchVentasMes }, 'fetchVentasMes')

    const first = renderReportes()
    await first.findByText('Ventas cobradas')

    first.unmount()

    mockState.sales = []

    renderReportes()

    expect(screen.queryByLabelText('Cargando reporte')).toBeNull()
    expect(await screen.findByText('Ventas cobradas')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})