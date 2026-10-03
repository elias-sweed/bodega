import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

type Listener = () => void

let channel: RealtimeChannel | null = null
let pendingTimer: number | null = null
const listeners = new Set<Listener>()

function notify(): void {
  // Reagrupa ráfagas de cambios en un solo aviso (máx. 1 cada 500 ms).
  if (pendingTimer !== null) window.clearTimeout(pendingTimer)
  pendingTimer = window.setTimeout(() => {
    pendingTimer = null
    for (const listener of Array.from(listeners)) listener()
  }, 500)
}

/** Escucha nuevas ventas de TODA la caja (PC, celular, etc.). */
export function subscribeToVentasLive(listener: Listener): () => void {
  listeners.add(listener)
  if (!channel) {
    channel = supabase
      .channel('ventas-en-vivo')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas' },
        () => notify(),
      )
      .subscribe()
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      if (pendingTimer !== null) window.clearTimeout(pendingTimer)
      pendingTimer = null
      void channel?.unsubscribe()
      channel = null
    }
  }
}
