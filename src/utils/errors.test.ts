import { describe, expect, it } from 'vitest'
import { getFriendlyError } from './errors'

describe('getFriendlyError', () => {
  it('indica el script correcto cuando la RPC de compras tiene sobrecargas', () => {
    const message = getFriendlyError(
      new Error(
        "PGRST203: Could not choose the best candidate function between public.registrar_compra(...) and public.registrar_compra(...)",
      ),
    )

    expect(message).toContain('fix_costo_compra_pendiente.sql')
  })

  it('indica el script correcto cuando la RPC de ajuste no existe', () => {
    const message = getFriendlyError(
      new Error("Could not find a function 'public.registrar_ajuste_manual(...)'"),
    )

    expect(message).toContain('fix_ajuste_stock.sql')
  })
})
