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

/** Normaliza para comparar palabras sin distinguir mayúsculas ni tildes. */
export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

/** Solo la fecha: "12/05/2026" */
export function formatFechaCorta(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

/** Solo la hora: "15:40" */
export function formatHora(value: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export type FranjaId = 'todo' | 'manana' | 'tarde' | 'noche'

/** Clave local YYYY-MM-DD para agrupar por día */
export function claveDia(value: string): string {
  const d = new Date(value)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Clave local YYYY-MM-DD de hoy */
export function claveHoy(): string {
  return claveDia(new Date().toISOString())
}

/** Mañana 06–12, tarde 12–19, noche 19–06 (hora local) */
export function enFranja(fechaISO: string, franja: FranjaId): boolean {
  if (franja === 'todo') return true
  const hora = new Date(fechaISO).getHours()
  if (!Number.isFinite(hora)) return true
  if (franja === 'manana') return hora >= 6 && hora < 12
  if (franja === 'tarde') return hora >= 12 && hora < 19
  return hora >= 19 || hora < 6
}

export function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}