import type { ProveedoresRow } from '../../types/database.types'

interface ProveedorSelectProps {
  proveedores: ProveedoresRow[]
  value: string
  onChange: (proveedorId: string) => void
}

export function ProveedorSelect({
  proveedores,
  value,
  onChange,
}: ProveedorSelectProps) {
  return (
    <div>
      <label htmlFor="proveedor" className="mb-2 block text-lg font-bold text-slate-800">
        1. Selecciona el proveedor
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
        {proveedores.map((proveedor) => (
          <option key={proveedor.id} value={proveedor.id}>
            {proveedor.nombre}
            {proveedor.empresa ? ` — ${proveedor.empresa}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}