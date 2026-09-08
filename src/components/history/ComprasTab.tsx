import { useIngresosHistory } from '../../hooks/useHistory'
import { formatDateTime, formatMoney } from '../../utils/format'

export function ComprasTab() {
  const { ingresos, proveedorMap, productoMap, loading, error, refresh } =
    useIngresosHistory()

  if (loading) {
    return <p className="py-10 text-center text-lg text-slate-400">Cargando compras…</p>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-rose-50 p-8 text-center">
        <p className="text-lg font-semibold text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (ingresos.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-500">
          No hay compras registradas todavía.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3 font-semibold">Fecha</th>
            <th className="px-5 py-3 font-semibold">Proveedor</th>
            <th className="px-5 py-3 font-semibold">Producto</th>
            <th className="px-5 py-3 text-right font-semibold">Cantidad</th>
            <th className="px-5 py-3 text-right font-semibold">Importe</th>
          </tr>
        </thead>
        <tbody>
          {ingresos.map((ingreso) => (
            <tr
              key={ingreso.id}
              className="border-b border-slate-100 last:border-none hover:bg-slate-50"
            >
              <td className="whitespace-nowrap px-5 py-3 text-slate-700">
                {formatDateTime(ingreso.fecha)}
              </td>
              <td className="px-5 py-3 text-slate-800">
                {proveedorMap[ingreso.proveedor_id ?? ''] ?? 'Proveedor eliminado'}
              </td>
              <td className="px-5 py-3 text-slate-600">
                {productoMap[ingreso.producto_id ?? ''] ?? 'Producto eliminado'}
              </td>
              <td className="px-5 py-3 text-right font-semibold text-slate-800">
                {ingreso.cantidad_ingresada}
              </td>
              <td className="px-5 py-3 text-right font-semibold text-slate-800">
                {formatMoney(ingreso.costo_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}