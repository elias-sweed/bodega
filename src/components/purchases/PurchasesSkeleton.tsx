export function PurchasesSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-label="Cargando compras" aria-busy="true">
      <section className="rounded-[28px] border border-line bg-surface p-6 backdrop-blur-2xl">
        <div className="skeleton-shimmer h-5 w-48 rounded-full" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="skeleton-shimmer h-12 w-full rounded-xl" />
          <div className="skeleton-shimmer h-12 w-full rounded-xl" />
        </div>
      </section>
      <section className="rounded-[28px] border border-line bg-surface p-6 backdrop-blur-2xl">
        <div className="skeleton-shimmer h-12 w-full max-w-md rounded-xl" />
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="skeleton-shimmer h-4 w-1/2 rounded-full" />
                <div className="skeleton-shimmer mt-2 h-3 w-1/4 rounded-full opacity-70" />
              </div>
              <div className="skeleton-shimmer h-10 w-24 shrink-0 rounded-lg" />
              <div className="skeleton-shimmer h-10 w-28 shrink-0 rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
