import type { FranjaId } from '../../utils/format'
import { formatFechaCorta } from '../../utils/format'

export type HistoryFilter = {
  from: Date | null
  to: Date | null
  query: string
  franja: FranjaId
}

/** Texto simple para vacíos: "el 12/05/2026 en la tarde" */
export function describeFilter(filter: HistoryFilter): string {
  const parts: string[] = []
  if (filter.from && filter.to) {
    const sameDay =
      filter.from.getFullYear() === filter.to.getFullYear() &&
      filter.from.getMonth() === filter.to.getMonth() &&
      filter.from.getDate() === filter.to.getDate()
    // `to` suele ser exclusivo (día siguiente): si difieren en 1 día es un solo día
    const diffDays = Math.round(
      (startOfDay(filter.to).getTime() - startOfDay(filter.from).getTime()) / 86400000,
    )
    if (sameDay || diffDays <= 1) {
      parts.push(`el ${formatFechaCorta(filter.from.toISOString())}`)
    }
  }
  if (filter.franja === 'manana') parts.push('en la mañana')
  else if (filter.franja === 'tarde') parts.push('en la tarde')
  else if (filter.franja === 'noche') parts.push('en la noche')
  return parts.join(' ')
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
