export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Cargando resumen" aria-busy="true">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] border border-line bg-surface p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-52 flex-1">
            <div className="skeleton-shimmer h-4 w-32 rounded-full" />
            <div className="skeleton-shimmer mt-4 h-14 w-72 max-w-full rounded-2xl" />
            <div className="skeleton-shimmer mt-3 h-4 w-44 rounded-full" />
          </div>
          <div className="skeleton-shimmer h-20 w-48 rounded-2xl" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="skeleton-shimmer h-10 w-36 rounded-2xl" />
          <div className="skeleton-shimmer h-10 w-32 rounded-2xl" />
          <div className="skeleton-shimmer h-10 w-28 rounded-2xl" />
        </div>
      </section>

      {/* Secundarias */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <section
            key={i}
            className="rounded-[28px] border border-line bg-surface p-6 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <div className="skeleton-shimmer h-4 w-28 rounded-full" />
            <div className="skeleton-shimmer mt-4 h-10 w-48 rounded-xl" />
            <div className="skeleton-shimmer mt-3 h-4 w-full rounded-full opacity-70" />
          </section>
        ))}
      </div>

      {/* Lista */}
      <section className="rounded-[28px] border border-line bg-surface p-6 backdrop-blur-2xl">
        <div className="skeleton-shimmer h-6 w-64 rounded-full" />
        <div className="skeleton-shimmer mt-2 h-4 w-48 rounded-full opacity-70" />
        <div className="mt-5 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="skeleton-shimmer h-5 w-2/3 rounded-full" />
                <div className="skeleton-shimmer mt-2 h-3 w-1/3 rounded-full opacity-70" />
              </div>
              <div className="skeleton-shimmer h-8 w-24 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
