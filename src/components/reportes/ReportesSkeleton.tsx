export function ReportesSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando reporte">
      <div className="flex justify-end">
        <div className="h-11 w-52 animate-pulse rounded-2xl bg-surface" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="rounded-[24px] border border-line bg-surface p-5"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-surface-2" />
            <div className="mt-3 h-8 w-32 animate-pulse rounded bg-surface-2" />
          </div>
        ))}
      </div>

      <div className="h-64 animate-pulse rounded-[28px] bg-surface" />
      <div className="h-56 animate-pulse rounded-[28px] bg-surface" />
    </div>
  )
}