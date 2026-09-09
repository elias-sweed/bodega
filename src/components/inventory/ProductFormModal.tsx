import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ProductosInsert, ProductosRow } from '../../types/database.types'

interface ProductFormModalProps {
  onClose: () => void
  onSubmit: (product: ProductosInsert) => Promise<void>
  initial?: ProductosRow | null
}

interface FormValues {
  nombre: string
  categoria: string
  codigo_barras: string
  precio_venta: string
  costo: string
  stock_actual: string
  stock_minimo: string
}

const EMPTY_VALUES: FormValues = {
  nombre: '',
  categoria: '',
  codigo_barras: '',
  precio_venta: '',
  costo: '',
  stock_actual: '',
  stock_minimo: '',
}

export function ProductFormModal({ onClose, onSubmit, initial }: ProductFormModalProps) {
  const [values, setValues] = useState<FormValues>(() =>
    initial
      ? {
          nombre: initial.nombre,
          categoria: initial.categoria,
          codigo_barras: initial.codigo_barras ?? '',
          precio_venta: String(initial.precio_venta),
          costo: String(initial.costo),
          stock_actual: String(initial.stock_actual),
          stock_minimo: String(initial.stock_minimo),
        }
      : EMPTY_VALUES,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setField = (field: keyof FormValues, value: string): void => {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const product: ProductosInsert = {
        nombre: values.nombre.trim(),
        categoria: values.categoria.trim(),
        codigo_barras: values.codigo_barras.trim() || null,
        precio_venta: Number(values.precio_venta),
        costo: Number(values.costo),
        stock_actual: Number(values.stock_actual),
        stock_minimo: Number(values.stock_minimo),
      }
      await onSubmit(product)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ocurrió un error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400'
  const labelClass = 'mb-1 block text-sm font-semibold text-slate-600'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nuevo-producto-title"
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-full w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="nuevo-producto-title" className="text-2xl font-bold text-slate-900">
            {initial ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl bg-slate-100 text-xl font-bold text-slate-500 transition-colors hover:bg-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="nombre" className={labelClass}>
              Nombre
            </label>
            <input
              id="nombre"
              required
              autoFocus
              value={values.nombre}
              onChange={(e) => setField('nombre', e.target.value)}
              className={inputClass}
              placeholder="Ej. Papitas grandes"
            />
          </div>

          <div>
            <label htmlFor="categoria" className={labelClass}>
              Categoría
            </label>
            <input
              id="categoria"
              required
              value={values.categoria}
              onChange={(e) => setField('categoria', e.target.value)}
              className={inputClass}
              placeholder="Ej. Snacks"
            />
          </div>

          <div>
            <label htmlFor="codigo_barras" className={labelClass}>
              Código de barras
            </label>
            <input
              id="codigo_barras"
              value={values.codigo_barras}
              onChange={(e) => setField('codigo_barras', e.target.value)}
              className={inputClass}
              placeholder="Opcional"
            />
          </div>

          <div>
            <label htmlFor="precio_venta" className={labelClass}>
              Precio de venta
            </label>
            <input
              id="precio_venta"
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={values.precio_venta}
              onChange={(e) => setField('precio_venta', e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="costo" className={labelClass}>
              Costo
            </label>
            <input
              id="costo"
              required
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={values.costo}
              onChange={(e) => setField('costo', e.target.value)}
              className={inputClass}
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="stock_actual" className={labelClass}>
              Stock actual
            </label>
            <input
              id="stock_actual"
              required
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.stock_actual}
              onChange={(e) => setField('stock_actual', e.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="stock_minimo" className={labelClass}>
              Stock mínimo
            </label>
            <input
              id="stock_minimo"
              required
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.stock_minimo}
              onChange={(e) => setField('stock_minimo', e.target.value)}
              className={inputClass}
              placeholder="0"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-rose-100 px-4 py-2 font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-14 flex-1 rounded-2xl bg-slate-100 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-14 flex-[2] rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {submitting ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar producto'}
          </button>
        </div>
      </form>
    </div>
  )
}