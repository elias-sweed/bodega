import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ProveedoresRow } from '../../types/database.types'

export const PROVEEDOR_OTROS = '__otros__'

interface ProveedorSelectProps {
  proveedores: ProveedoresRow[]
  value: string
  onChange: (proveedorId: string) => void
  onAddProveedor: (nombre: string, empresa?: string) => Promise<ProveedoresRow>
}

const inputClass =
  'h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400'

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
    if (saving || !nombre.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await onAddProveedor(nombre.trim(), empresa.trim() || undefined)
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
      <label htmlFor="proveedor" className="mb-2 block text-lg font-bold text-slate-800">
        1. ¿Quién trajo la mercadería?
      </label>
      <select
        id="proveedor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 shadow-sm outline-none transition-colors focus:border-sky-400"
      >
        <option value="" disabled>
          Elige un proveedor…
        </option>
        <option value={PROVEEDOR_OTROS}>
          Otro / no lo recuerdo
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
        className="mt-3 text-sm font-bold text-sky-600 hover:text-sky-700"
      >
        {showForm ? '− Cerrar' : '+ Es la primera vez, registrar proveedor'}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex flex-col gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4"
        >
          <div>
            <label htmlFor="nuevo-proveedor-nombre" className="mb-1 block text-sm font-semibold text-slate-600">
              Nombre del proveedor
            </label>
            <input
              id="nuevo-proveedor-nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClass}
              placeholder="Ej. José Ramírez"
            />
          </div>
          <div>
            <label htmlFor="nuevo-proveedor-empresa" className="mb-1 block text-sm font-semibold text-slate-600">
              Empresa (opcional)
            </label>
            <input
              id="nuevo-proveedor-empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className={inputClass}
              placeholder="Ej. Distribuidora El Sol"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="h-12 rounded-xl bg-sky-500 text-base font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {saving ? 'Guardando…' : 'Guardar y usar este proveedor'}
          </button>
        </form>
      )}
    </div>
  )
}