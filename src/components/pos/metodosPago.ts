export const METODOS_PAGO = ['Efectivo', 'Yape', 'Plin'] as const
export type MetodoPago = (typeof METODOS_PAGO)[number]
export const METODO_PAGO_DEFAULT: MetodoPago = 'Efectivo'