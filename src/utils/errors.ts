/**
 * Traduce errores de la base de datos / RPC (mensajes crudos de Postgres o
 * Supabase) a mensajes legibles. Usarlo en TODOS los toasts, no solo en auth.
 */
export function getFriendlyError(
  error: unknown,
  fallback = 'Ocurrió un error inesperado. Inténtalo de nuevo.',
): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()

  if (!message || message === 'Error: ' ) return fallback

  if (message.includes('No autorizado')) {
    return 'Tu cuenta no tiene permisos para esta acción. Contacta al administrador.'
  }
  if (message.includes('Solo el administrador puede editar productos')) {
    return 'Solo el administrador puede editar productos. Contacta al administrador.'
  }

  const stockMatch = message.match(/disponible[:]?\s*(\d+)/i)
  if (lower.includes('stock insuficiente')) {
    return stockMatch
      ? `No hay stock suficiente para vender esa cantidad (disponible: ${stockMatch[1]}). Ajusta la cantidad o registra una compra.`
      : 'No hay stock suficiente para vender esa cantidad. Ajusta la cantidad o registra una compra.'
  }
  if (lower.includes('la cantidad debe ser mayor a 0')) {
    return 'La cantidad debe ser mayor a 0.'
  }
  if (lower.includes('stock no puede ser negativo')) {
    return 'El stock no puede ser negativo.'
  }
  if (lower.includes('violates foreign key constraint')) {
    return 'No se puede eliminar: hay ventas o compras que lo usan. Mejor ocúltalo o ajústale el stock.'
  }
  if (
    lower.includes('duplicate key') ||
    lower.includes('23505') ||
    lower.includes('unique constraint')
  ) {
    return 'Ya existe un registro con ese mismo dato (nombre o código de barras).'
  }
  if (lower.includes('permission denied') || lower.includes('permission denied for table')) {
    return 'No tienes permisos para esta acción. Contacta al administrador.'
  }
  if (lower.includes('el producto no existe')) {
    return 'El producto ya no existe. Refresca la lista e inténtalo de nuevo.'
  }
  if (lower.includes('does not exist') || lower.includes('could not find a function')) {
    return 'La base de datos no está al día. Ejecuta las migraciones SQL pendientes (mejoras.sql, usuarios.sql y mejoras_v2.sql, en ese orden) y vuelve a intentarlo.'
  }
  if (lower.includes('no route matches') || lower.includes('pgrst')) {
    return fallback
  }

  return fallback
}

export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''

  if (!message) {
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
  }
  if (message.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (message.includes('Email not confirmed')) {
    // Genérico a propósito: no revelar si el correo existe o no.
    return 'Correo o contraseña incorrectos.'
  }
  if (message.includes('User already registered')) {
    return 'Ya existe una cuenta con ese correo electrónico.'
  }
  if (message.toLowerCase().includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (message.includes('Invalid email')) {
    return 'Ingresa un correo electrónico válido.'
  }
  if (
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('security purposes') ||
    message.toLowerCase().includes('too many') ||
    message.toLowerCase().includes('hourly') ||
    message.toLowerCase().includes('429')
  ) {
    return 'Estás pidiendo correos muy seguido. Esta función solo permite unos pocos envíos por hora; espera unos minutos y vuelve a intentarlo.'
  }
  if (message.toLowerCase().includes('expired')) {
    return 'El enlace ha expirado o ya fue usado. Solicita uno nuevo.'
  }
  if (message.toLowerCase().includes('same as present password')) {
    return 'La nueva contraseña debe ser diferente a la actual.'
  }

  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}