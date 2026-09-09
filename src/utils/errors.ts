export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''

  if (!message) {
    return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
  }
  if (message.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.'
  }
  if (message.includes('Email not confirmed')) {
    return 'Confirma tu correo electrónico antes de iniciar sesión.'
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