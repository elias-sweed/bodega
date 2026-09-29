import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '../context/AuthContext'
import { MOVIMIENTOS_WELCOME_KEY } from '../components/movimientos/MovimientosWelcomeModal'
import { MovimientosPage } from './MovimientosPage'

function valorAuth(): AuthContextValue {
  return {
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
  }
}

function DireccionActual() {
  return <span data-testid="direccion">{useLocation().search}</span>
}

function renderMovimientos(ruta = '/movimientos') {
  localStorage.setItem(MOVIMIENTOS_WELCOME_KEY, 'true')
  const user = userEvent.setup()
  const utils = render(
    <MemoryRouter initialEntries={[ruta]}>
      <AuthContext.Provider value={valorAuth()}>
        <MovimientosPage />
        <DireccionActual />
      </AuthContext.Provider>
    </MemoryRouter>,
  )
  return { user, ...utils }
}

describe('MovimientosPage', () => {
  it('deja un solo título de sección y abre en Resumen', () => {
    renderMovimientos()

    const titulos = screen.getAllByRole('heading', { level: 1 })
    expect(titulos).toHaveLength(1)
    expect(titulos[0]).toHaveTextContent('¿Qué pasó en la bodega?')

    expect(screen.getByRole('tab', { name: /Resumen/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /Detalle/ })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('tabpanel', { name: /Resumen/ })).toBeVisible()
  })

  it('cambia a Detalle y lo deja anotado en la dirección', async () => {
    const { user } = renderMovimientos()

    await user.click(screen.getByRole('tab', { name: /Detalle/ }))

    expect(screen.getByRole('tab', { name: /Detalle/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /Resumen/ })).toHaveAttribute(
      'tabindex',
      '-1',
    )
    expect(screen.getByTestId('direccion')).toHaveTextContent('?tab=detalle')
    expect(screen.getByRole('tabpanel', { name: /Detalle/ })).toBeVisible()
    expect(screen.queryByRole('tabpanel', { name: /Resumen/ })).toBeNull()
  })

  it('abre directo en Detalle cuando la dirección lo pide', () => {
    renderMovimientos('/movimientos?tab=detalle')

    expect(screen.getByRole('tab', { name: /Detalle/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel', { name: /Detalle/ })).toBeVisible()
  })

  it('no pierde lo escrito en el buscador al volver a la pestaña', async () => {
    const { user } = renderMovimientos()

    await user.click(screen.getByRole('tab', { name: /Detalle/ }))
    await user.type(screen.getByRole('searchbox'), 'gaseosa')

    await user.click(screen.getByRole('tab', { name: /Resumen/ }))
    await user.click(screen.getByRole('tab', { name: /Detalle/ }))

    expect(screen.getByRole('searchbox')).toHaveValue('gaseosa')
  })

  it('salta entre pestañas con las flechas del teclado', async () => {
    const { user } = renderMovimientos()

    screen.getByRole('tab', { name: /Resumen/ }).focus()
    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: /Detalle/ })).toHaveFocus()
    expect(screen.getByRole('tab', { name: /Detalle/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: /Resumen/ })).toHaveFocus()
  })
})
