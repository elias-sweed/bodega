export function PosSkeleton() {
  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
      aria-label="Cargando caja"
      aria-busy="true"
    >
      <section className="flex min-h-0 flex-col gap-4">
        <div className="skeleton-shimmer h-16 w-full shrink-0 rounded-2xl" />
        <div className="skeleton-shimmer h-6 w-40 rounded-full" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="rounded-[22px] border border-line bg-surface p-5 backdrop-blur-2xl"
            >
              <div className="skeleton-shimmer h-12 w-12 rounded-2xl" />
              <div className="skeleton-shimmer mt-4 h-5 w-3/4 rounded-full" />
              <div className="skeleton-shimmer mt-2 h-6 w-1/2 rounded-full" />
              <div className="skeleton-shimmer mt-3 h-2 w-full rounded-full opacity-70" />
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-[28px] border border-line bg-surface p-5 backdrop-blur-2xl">
        <div className="skeleton-shimmer h-6 w-28 rounded-full" />
        <div className="mt-6 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="skeleton-shimmer h-4 w-2/3 rounded-full" />
                <div className="skeleton-shimmer mt-2 h-3 w-1/3 rounded-full opacity-70" />
              </div>
              <div className="skeleton-shimmer h-9 w-20 shrink-0 rounded-xl" />
            </div>
          ))}
        </div>
        <div className="skeleton-shimmer mt-6 h-10 w-full rounded-2xl" />
        <div className="skeleton-shimmer mt-3 h-16 w-full rounded-2xl" />
      </aside>
    </div>
  )
}
