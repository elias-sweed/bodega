interface CostoStepProps {
  cantidad: string
  costoTotal: string
  onCantidadChange: (value: string) => void
  onCostoChange: (value: string) => void
}

const inputClass =
  'h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-lg text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400'
const labelClass = 'mb-2 block text-lg font-bold text-slate-800'

export function CostoStep({
  cantidad,
  costoTotal,
  onCantidadChange,
  onCostoChange,
}: CostoStepProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div>
        <label htmlFor="cantidad" className={labelClass}>
          3. Cantidad a ingresar
        </label>
        <input
          id="cantidad"
          required
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={cantidad}
          onChange={(e) => onCantidadChange(e.target.value)}
          className={inputClass}
          placeholder="Ej. 10"
        />
      </div>
      <div>
        <label htmlFor="costoTotal" className={labelClass}>
          Costo total de la compra
        </label>
        <input
          id="costoTotal"
          required
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={costoTotal}
          onChange={(e) => onCostoChange(e.target.value)}
          className={inputClass}
          placeholder="0.00"
        />
      </div>
    </div>
  )
}