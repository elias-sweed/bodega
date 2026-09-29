import { useState, useEffect } from 'react'
import { BarChart3, History, X, HelpCircle } from 'lucide-react'

const STORAGE_KEY = 'movimientos-welcome-seen'

export function MovimientosWelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (!seen) {
      setIsOpen(true)
    }
  }, [])

  const close = (): void => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  const reopen = (): void => {
    setIsOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={reopen}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-muted transition-all hover:bg-surface-2 hover:text-ink"
        title="¿Qué es esto?"
        aria-label="Ver ayuda de Movimientos"
      >
        <HelpCircle size={18} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                  Movimientos
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tighter text-ink">
                  ¿Qué quieres hacer?
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-muted hover:bg-surface-2 hover:text-ink"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex gap-4 rounded-2xl border border-line bg-surface-sub p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-400/15 text-gold">
                  <BarChart3 size={24} />
                </span>
                <div>
                  <p className="text-base font-black text-ink">¿Cuánto gané?</p>
                  <p className="mt-1 text-sm text-muted">
                    Mira tus ventas totales, cuánto ganaste y qué productos se vendieron más.
                    Elige un día, semana o mes.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl border border-line bg-surface-sub p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-400/15 text-sky-200">
                  <History size={24} />
                </span>
                <div>
                  <p className="text-base font-black text-ink">¿Qué vendí o compré?</p>
                  <p className="mt-1 text-sm text-muted">
                    Busca ventas, compras o ajustes de stock específicos.
                    Filtra por fecha, horario o palabra.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-2xl border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 py-3 text-sm font-black uppercase tracking-widest text-slate-900 shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
