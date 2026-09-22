export function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Cargando historial" aria-busy="true">
      <div className="skeleton-shimmer h-[68px] w-full rounded-[28px]" />
      <ul className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-4 rounded-[28px] border border-line bg-surface px-5 py-4 backdrop-blur-2xl"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div className="skeleton-shimmer h-4 w-16 rounded-full" />
              <div className="skeleton-shimmer h-4 w-32 rounded-full opacity-70" />
              <div className="skeleton-shimmer h-6 w-20 rounded-full opacity-70" />
            </div>
            <div className="skeleton-shimmer h-6 w-24 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  )
}
