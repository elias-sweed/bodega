/**
 * Reglas de clave nueva (plan gratis: reemplazo local de HaveIBeenPwned).
 * Solo se aplican al CREAR/cambiar clave, nunca al entrar (las viejas siguen valiendo).
 */

const MIN_LENGTH = 8

const CLAVES_PROHIBIDAS = new Set(
  [
    '12345678',
    'password',
    'contraseña',
    'contrasena',
    'bodega123',
    'bodega1234',
    'evanlu123',
    'evanlu1234',
    'admin123',
    'admin1234',
    'cajero123',
    'ventas123',
    'inca1234',
    'cocacola1',
    'qwerty123',
    'abc12345',
    '123456789',
    '00000000',
    '11111111',
    'peru1234',
    'lima1234',
    'negocio1',
    'tienda123',
    'clave123',
    'clave1234',
  ].map((c) => c.toLowerCase()),
)

export function validarClaveNueva(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`
  }
  const lower = password.toLowerCase()
  if (CLAVES_PROHIBIDAS.has(lower)) {
    return 'Esa contraseña es muy usada y fácil de adivinar. Elige otra.'
  }
  // Secuencias obvias: 12345678, abcd..., mismo caracter repetido
  if (/^(.)\1+$/.test(password)) {
    return 'No uses el mismo caracter repetido.'
  }
  if (/^(0123456789|1234567890|abcdefghij)/.test(lower)) {
    return 'No uses secuencias obvias como 123456.'
  }
  return null
}
