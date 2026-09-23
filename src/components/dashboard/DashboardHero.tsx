import type { ReactNode } from 'react'
import { CalendarDays, RefreshCw, Sparkles } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

function saludoPorHora(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function fechaLarga(): string {
  return new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function nombreUsuario(user: { email?: string | null; user_metadata?: unknown }): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const completo =
    (typeof meta?.full_name === 'string' ? meta.full_name : '') ||
    (typeof meta?.name === 'string' ? meta.name : '')
  if (completo.trim()) return completo.trim().split(/\s+/)[0]
  return user.email ? user.email.split('@')[0] : ''
}

interface DashboardHeroProps {
  /** Línea de apoyo bajo el título */
  subtitulo: ReactNode
  /** Badge de frescura, p. ej. "actualizado hace 2 min" */
  freshness?: string | null
  isRefreshing?: boolean
  /** Si se pasa, muestra el botón de actualizar */
  onRefresh?: () => void
}

export function DashboardHero({
  subtitulo,
  freshness,
  isRefreshing,
  onRefresh,
}: DashboardHeroProps) {
  const { user } = useAuth()
  const nombre = user ? nombreUsuario(user) : ''

  return (
    <header className="relative shrink-0 overflow-hidden rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl sm:p-7">
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted">
            <Sparkles size={12} aria-hidden="true" className="text-amber-700" />
            Bodega · Panel
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tighter text-ink  sm:text-4xl">
            {saludoPorHora()}
            {nombre && <span className="text-indigo-600">, {nombre}</span>}
          </h1>

          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-bold capitalize text-ink">
              <CalendarDays size={13} aria-hidden="true" className="text-indigo-600" />
              {fechaLarga()}
            </span>
            <span>{subtitulo}</span>
            {freshness && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-bold text-muted backdrop-blur-xl">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isRefreshing ? 'animate-pulse bg-amber-300' : 'bg-emerald-300'}`}
                />
                {isRefreshing ? 'actualizando…' : freshness}
              </span>
            )}
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl border border-line bg-surface-2 px-5 text-sm font-extrabold tracking-tight text-ink shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={isRefreshing ? 'animate-spin' : ''}
            />
            {isRefreshing ? 'Actualizando' : 'Actualizar'}
          </button>
        )}
      </div>
    </header>
  )
}
