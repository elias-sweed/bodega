import { useMemo, useState } from 'react'
import type { ProductosInsert, ProductosRow } from '../../types/database.types'
import { ProductFormModal } from '../inventory/ProductFormModal'

interface ProductoSelectProps {
  productos: ProductosRow[]
  value: string
  onChange: (productoId: string) => void
  onCreateProduct: (product: ProductosInsert) => Promise<ProductosRow>
}

export function ProductoSelect({
  productos,
  value,
  onChange,
  onCreateProduct,
}: ProductoSelectProps) {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

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

      <button
        type="button"
        onClick={() => setShowCreate(true)}
        className="mt-3 text-sm font-bold text-sky-600 hover:text-sky-700"
      >
        + ¿El producto no existe? Créalo ahora
      </button>

      {showCreate && (
        <ProductFormModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (product) => {
            const created = await onCreateProduct(product)
            onChange(created.id)
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}