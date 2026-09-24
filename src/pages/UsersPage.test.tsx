import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '../context/AuthContext'
import { mockState } from '../mocks/handlers'
import { UsersPage } from './UsersPage'
import { fetchUsuariosAutorizados } from '../services/users'

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

  return function renderUsers() {
    return render(
      <MemoryRouter initialEntries={['/usuarios']}>
        <AuthWrapper>
          <UsersPage />
        </AuthWrapper>
      </MemoryRouter>,
    )
  }
}

describe('UsersPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('la primera entrada muestra el skeleton y luego el listado', async () => {
    mockState.authorizedUsers = [
      {
        email: 'a@test.local',
        rol: 'admin',
        created_at: '2026-09-20T12:00:00Z',
      },
    ]

    const renderUsers = mockAuth()
    renderUsers()

    expect(screen.getByLabelText('Cargando usuarios')).toBeInTheDocument()
    expect(await screen.findByText('a@test.local')).toBeInTheDocument()
  })

  it('la segunda entrada carga directo desde caché, sin skeleton ni refetch', async () => {
    mockState.authorizedUsers = [
      {
        email: 'a@test.local',
        rol: 'admin',
        created_at: '2026-09-20T12:00:00Z',
      },
    ]

    const fetchSpy = vi.spyOn({ fetchUsuariosAutorizados }, 'fetchUsuariosAutorizados')

    const renderUsers = mockAuth()
    const first = renderUsers()
    await first.findByText('a@test.local')

    first.unmount()

    mockState.authorizedUsers = []

    const second = renderUsers()

    expect(screen.queryByLabelText('Cargando usuarios')).toBeNull()
    expect(await second.findByText('a@test.local')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})