export function InventorySkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Cargando inventario" aria-busy="true">
      <div className="flex flex-wrap gap-3">
        <div className="skeleton-shimmer h-11 w-full max-w-xs rounded-xl" />
        <div className="skeleton-shimmer h-11 w-44 rounded-xl" />
      </div>
      <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-2xl">
        <div className="flex flex-col">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-white/10 px-5 py-4 last:border-none"
            >
              <div className="min-w-0 flex-1">
                <div className="skeleton-shimmer h-4 w-1/3 rounded-full" />
                <div className="skeleton-shimmer mt-2 h-3 w-1/4 rounded-full opacity-70" />
              </div>
              <div className="skeleton-shimmer hidden h-6 w-20 shrink-0 rounded-full sm:block" />
              <div className="skeleton-shimmer h-6 w-14 shrink-0 rounded-full" />
              <div className="skeleton-shimmer h-8 w-24 shrink-0 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
