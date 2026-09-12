export function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      /^\d+[a-z]+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

/**
 * Compara una fecha ISO con los límites del filtro usando instantes absolutos
 * (epoch en milisegundos), para que nunca importe la zona horaria del servidor
 * (NOW() viaja en UTC) ni la del navegador: solo importa el instante real.
 */
export function fechaEnRango(
  iso: string,
  from: Date | null,
  to: Date | null,
): boolean {
  const instante = new Date(iso).getTime()
  if (!Number.isFinite(instante)) return true
  if (from && instante < from.getTime()) return false
  if (to && instante > to.getTime()) return false
  return true
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(value)
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(value))
    .replace(', ', ' ')
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}