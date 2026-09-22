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
  'h-12 w-full rounded-xl border border-line bg-surface px-4 text-base font-semibold text-ink outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-muted/70 focus:border-line-strong focus:bg-surface-2'

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
        className="h-14 w-full cursor-pointer rounded-2xl border border-line bg-surface px-4 text-base font-semibold text-ink shadow-sm outline-none backdrop-blur-2xl transition-all duration-300 hover:bg-surface-2 focus:border-line-strong [&>option]:bg-[#171242] [&>option]:text-ink"
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
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-extrabold text-ink backdrop-blur-xl transition-all duration-200 hover:bg-surface-3 active:scale-95"
      >
        <Plus size={15} strokeWidth={3} aria-hidden="true" />
        {showForm ? 'Cerrar' : 'Registrar un proveedor nuevo'}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="fade-in mt-3 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 backdrop-blur-xl"
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
            <p className="rounded-xl border border-rose-200/30 bg-rose-400/20 px-4 py-2 text-sm font-bold text-rose-100">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-2xl border border-sky-200/30 bg-gradient-to-br from-sky-400/90 to-sky-600/90 text-base font-black text-ink shadow-[0_14px_36px_-14px_rgba(56,189,248,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? 'Guardando…' : 'Guardar y usar este proveedor'}
          </button>
        </form>
      )}
    </div>
  )
}
