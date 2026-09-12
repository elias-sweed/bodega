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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2
              id="gestion-proveedores-title"
              className="text-xl font-black text-slate-900"
            >
              Gestionar proveedores
            </h2>
            <p className="text-sm text-slate-500">
              Elimina proveedores antiguos o creados por error. Las compras
              anteriores conservarán su fecha e importe.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}

        {proveedores.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-10 text-center text-slate-400">
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
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-100 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">
                      {proveedor.nombre}
                    </p>
                    {proveedor.empresa && (
                      <p className="truncate text-sm text-slate-500">
                        {proveedor.empresa}
                      </p>
                    )}
                  </div>

                  {confirming ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        ¿Eliminar?
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleEliminar(proveedor.id)}
                        className="h-9 rounded-lg bg-rose-600 px-3 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                      >
                        {busy ? '…' : 'Sí'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmingId(null)}
                        className="h-9 rounded-lg border-2 border-slate-200 px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(proveedor.id)}
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-rose-100 px-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-200"
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