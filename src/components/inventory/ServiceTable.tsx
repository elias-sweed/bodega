import { Pencil, Repeat, Trash2 } from 'lucide-react'
import type { ProductosRow } from '../../types/database.types'
import { formatMoney } from '../../utils/format'

interface ServiceTableProps {
  services: ProductosRow[]
  /** Catálogo completo, para resolver el nombre del insumo vinculado. */
  catalog: ProductosRow[]
  isAdmin?: boolean
  onEdit?: (product: ProductosRow) => void
  onDelete?: (product: ProductosRow) => void
}

/**
 * Los servicios no tienen stock propio: la tabla muestra los datos que
 * importan (precio y qué insumo descuenta), a diferencia de ProductTable.
 */
export function ServiceTable({
  services,
  catalog,
  isAdmin = false,
  onEdit,
  onDelete,
}: ServiceTableProps) {
  if (services.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-line bg-surface p-10 text-center backdrop-blur-2xl">
        <h2 className="text-lg font-black tracking-tight text-ink">
          Aún no hay servicios
        </h2>
        <p className="mt-2 text-sm font-medium text-muted">
          Crea servicios como "Impresión B/N", "Copia a colores", "Escaneo" o
          "Tipeo" para cobrarlos en Caja.
        </p>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-sm backdrop-blur-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.18em] text-muted">
              <th className="px-5 py-4 font-black">Servicio</th>
              <th className="px-5 py-4 font-black">Categoría</th>
              <th className="px-5 py-4 text-right font-black">Precio</th>
              <th className="px-5 py-4 font-black">Descuenta del stock</th>
              <th className="px-5 py-4 text-right font-black">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => {
              const insumo =
                service.consumo_producto_id !== null
                  ? catalog.find(
                      (p) => p.id === service.consumo_producto_id,
                    )
                  : undefined
              return (
                <tr
                  key={service.id}
                  className="border-b border-line transition-colors duration-200 last:border-none hover:bg-surface-2"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-black tracking-tight text-ink">
                      {service.nombre}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{service.categoria}</td>
                  <td className="px-5 py-3.5 text-right font-black tabular-nums text-amber-200">
                    {formatMoney(service.precio_venta)}
                  </td>
                  <td className="px-5 py-3.5">
                    {insumo && service.consumo_por_unidad > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-300">
                        <Repeat size={12} aria-hidden="true" />
                        {service.consumo_por_unidad} × {insumo.nombre}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-bold text-muted">
                        No descuenta stock
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit?.(service)}
                            title="Editar servicio"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-black text-ink transition-colors hover:bg-surface-3"
                          >
                            <Pencil size={13} aria-hidden="true" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete?.(service)}
                            title="Eliminar servicio"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300/30 bg-rose-400/15 px-3 py-1.5 text-xs font-black text-loss transition-colors hover:bg-rose-400/25"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
