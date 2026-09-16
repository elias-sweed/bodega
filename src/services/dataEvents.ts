type Listener = () => void

const listeners = new Set<Listener>()

/**
 * Avisa a las pantallas que dependen de datos (Resumen, Historial) que algo
 * cambió (una venta, una compra), para que se refresquen en silencio.
 */
export function subscribeToDataChanges(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitDataChanged(): void {
  for (const listener of listeners) {
    listener()
  }
}