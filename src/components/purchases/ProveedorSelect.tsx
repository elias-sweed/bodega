import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import type { ProveedoresRow } from '../../types/database.types'
import { toTitleCase } from '../../utils/format'

export const PROVEEDOR_GENERICO = '__varios__'

interface ProveedorSelectProps {
  proveedores: ProveedoresRow[]
  value: string
  onChange: (proveedorId: string) => void
  onAddProveedor: (nombre: string, empresa?: string) => Promise<ProveedoresRow>
}

const inputClass =
  'h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-base font-semibold text-ink outline-none placeholder:text-muted/70 focus:border-amber-300/70 focus:bg-surface-3 focus:ring-4 focus:ring-amber-400/10'

export function ProveedorSelect({
  proveedores,
  value,
  onChange,
  onAddProveedor,
}: ProveedorSelectProps) {
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const nombreLimpio = toTitleCase(nombre.trim())
    const empresaLimpia = toTitleCase(empresa.trim())
    if (saving || !nombreLimpio) return
    setSaving(true)
    setError(null)
    try {
      const created = await onAddProveedor(
        nombreLimpio,
        empresaLimpia || undefined,
      )
      onChange(created.id)
      setShowForm(false)
      setNombre('')
      setEmpresa('')
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo crear el proveedor',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <label htmlFor="proveedor" className="mb-2 block text-base font-extrabold tracking-tight text-ink">
        ¿Quién trajo la mercadería?
      </label>
      <select
        id="proveedor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full cursor-pointer rounded-2xl border border-line bg-surface-2 px-4 text-base font-semibold text-ink shadow-sm outline-none focus:border-amber-300/70 [&>option]:bg-[#241b66] [&>option]:text-slate-100"
      >
        <option value={PROVEEDOR_GENERICO}>
          Proveedor Varios / Sin Comprobante
        </option>
        {proveedores.map((proveedor) => (
          <option key={proveedor.id} value={proveedor.id}>
            {proveedor.nombre}
            {proveedor.empresa ? ` — ${proveedor.empresa}` : ''}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => setShowForm((open) => !open)}
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm font-extrabold text-ink transition-colors hover:bg-surface-3 active:scale-95"
      >
        <Plus size={15} strokeWidth={3} aria-hidden="true" />
        {showForm ? 'Cerrar' : 'Registrar un proveedor nuevo'}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-4"
        >
          <div>
            <label htmlFor="nuevo-proveedor-nombre" className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-muted">
              Nombre del proveedor
            </label>
            <input
              id="nuevo-proveedor-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => setNombre((value) => toTitleCase(value.trim()))}
              className={inputClass}
              placeholder="Ej. José Ramírez"
            />
          </div>
          <div>
            <label htmlFor="nuevo-proveedor-empresa" className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-muted">
              Empresa (opcional)
            </label>
            <input
              id="nuevo-proveedor-empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              onBlur={() => setEmpresa((value) => toTitleCase(value.trim()))}
              className={inputClass}
              placeholder="Ej. Distribuidora El Sol"
            />
          </div>
          {error && (
            <p className="rounded-xl border border-rose-400/40 bg-rose-400/15 px-4 py-2 text-sm font-bold text-loss">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 text-base font-black text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar y usar este proveedor'}
          </button>
        </form>
      )}
    </div>
  )
}
