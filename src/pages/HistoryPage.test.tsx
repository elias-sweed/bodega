import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '../context/AuthContext'
import { mockState } from '../mocks/handlers'
import { HistoryPage } from './HistoryPage'
import { fetchVentasHistory } from '../services/history'

function mockAuth() {
  const value = {
    user: { email: 'admin@test.local' } as never,
    session: null,
    loading: false,
    rol: 'admin',
    roleLoading: false,
    isPasswordRecovery: false,
    sessionExpired: false,
    acknowledgeExpired: () => undefined,
    signInWithPassword: async () => undefined,
    signOut: async () => undefined,
    resetPassword: async () => undefined,
    updatePassword: async () => undefined,
  } as AuthContextValue

  function AuthWrapper({ children }: { children: ReactNode }) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }

  return function renderHistory() {
    return render(
      <MemoryRouter initialEntries={['/historial']}>
        <AuthWrapper>
          <HistoryPage />
        </AuthWrapper>
      </MemoryRouter>,
    )
  }
}

describe('HistoryPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('la primera entrada muestra el skeleton y luego la lista de ventas', async () => {
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
    mockState.saleDetails = []

    const renderHistory = mockAuth()
    renderHistory()

    expect(screen.getByLabelText('Cargando historial')).toBeInTheDocument()
    expect(
      await screen.findByText('Total ventas registradas'),
    ).toBeInTheDocument()
  })

  it('la segunda entrada carga directo desde caché, sin skeleton ni refetch', async () => {
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
    mockState.saleDetails = []

    const fetchSpy = vi.spyOn({ fetchVentasHistory }, 'fetchVentasHistory')

    const renderHistory = mockAuth()
    const first = renderHistory()
    await first.findByText('Total ventas registradas')

    first.unmount()

    mockState.sales = []

    const second = renderHistory()

    expect(screen.queryByLabelText('Cargando historial')).toBeNull()
    expect(
      await second.findByText('Total ventas registradas'),
    ).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})