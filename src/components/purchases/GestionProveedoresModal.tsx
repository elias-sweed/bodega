import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import type { ProveedoresRow } from '../../types/database.types'

interface GestionProveedoresModalProps {
  proveedores: ProveedoresRow[]
  onClose: () => void
  onEliminar: (id: string) => Promise<void>
}

export function GestionProveedoresModal({
  proveedores,
  onClose,
  onEliminar,
}: GestionProveedoresModalProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEliminar = async (id: string): Promise<void> => {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      await onEliminar(id)
      setConfirmingId(null)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo eliminar el proveedor',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gestion-proveedores-title"
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#0b0420]/85 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="fade-up max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
              Compras
            </p>
            <h2
              id="gestion-proveedores-title"
              className="text-xl font-black tracking-tighter text-ink"
            >
              Gestionar proveedores
            </h2>
            <p className="mt-1 text-sm font-medium text-muted">
              Elimina proveedores antiguos o creados por error. Las compras
              anteriores conservarán su fecha e importe.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-200 hover:bg-surface-3 hover:text-ink"
          >
            <X size={16} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-100 px-4 py-2 text-sm font-bold text-rose-700">
            {error}
          </p>
        )}

        {proveedores.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface-sub px-5 py-10 text-center text-sm font-semibold text-muted">
            No hay proveedores registrados.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {proveedores.map((proveedor) => {
              const confirming = confirmingId === proveedor.id
              const busy = busyId === proveedor.id
              return (
                <li
                  key={proveedor.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 backdrop-blur-xl"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold tracking-tight text-ink">
                      {proveedor.nombre}
                    </p>
                    {proveedor.empresa && (
                      <p className="truncate text-xs font-medium text-muted">
                        {proveedor.empresa}
                      </p>
                    )}
                  </div>

                  {confirming ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-bold text-muted">
                        ¿Eliminar?
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleEliminar(proveedor.id)}
                        className="h-9 rounded-xl border border-rose-200/30 bg-rose-500 px-3 text-sm font-black text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                      >
                        {busy ? '…' : 'Sí'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmingId(null)}
                        className="h-9 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink transition-all hover:bg-surface-3 disabled:opacity-50"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(proveedor.id)}
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-100 px-3 text-sm font-black text-rose-700 transition-all duration-200 hover:bg-rose-200/60 active:scale-95"
                    >
                      <Trash2 size={15} strokeWidth={2.5} aria-hidden="true" />
                      Eliminar
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
