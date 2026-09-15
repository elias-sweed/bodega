export type MetodoBilletera = 'Yape' | 'Plin'

export function getPaymentNumber(method: MetodoBilletera): string | null {
  const value =
    method === 'Yape'
      ? import.meta.env.VITE_YAPE_NUMBER
      : import.meta.env.VITE_PLIN_NUMBER
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim()
  }
  return null
}