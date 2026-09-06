import { useMemo, useState } from 'react'
import type { ProductosRow } from '../../types/database.types'

interface ProductoSelectProps {
  productos: ProductosRow[]
  value: string
  onChange: (productoId: string) => void
}

export function ProductoSelect({ productos, value, onChange }: ProductoSelectProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return productos
    return productos.filter(
      (producto) =>
        producto.nombre.toLowerCase().includes(query) ||
        producto.codigo_barras?.toLowerCase().includes(query),
    )
  }, [productos, search])

  return (
    <div>
      <label htmlFor="producto" className="mb-2 block text-lg font-bold text-slate-800">
        2. Selecciona el producto
      </label>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o código de barras…"
        className="mb-3 h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400"
      />
      <select
        id="producto"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 shadow-sm outline-none transition-colors focus:border-sky-400"
      >
        <option value="" disabled>
          Elige un producto…
        </option>
        {filtered.map((producto) => (
          <option key={producto.id} value={producto.id}>
            {producto.nombre} — stock: {producto.stock_actual}
          </option>
        ))}
      </select>
    </div>
  )
}