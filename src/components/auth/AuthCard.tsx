import type { ReactNode } from 'react'

export const authInputClass =
  'h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-amber-300/70 focus:bg-white/10 focus:ring-4 focus:ring-amber-400/15'
export const authLabelClass =
  'mb-1.5 block text-[11px] font-black uppercase tracking-[0.18em] text-amber-200/80'
export const authButtonClass =
  'h-12 w-full rounded-xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 text-base font-black uppercase tracking-[0.15em] text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-all hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none'
export const authLinkClass =
  'text-sm font-semibold text-amber-300 transition-colors hover:text-amber-200'

interface AuthCardProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="fade-up relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-24 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        aria-hidden="true"
      />

      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-400/25 to-amber-600/10 text-2xl shadow-[0_0_35px_-8px_rgba(251,191,36,0.5)]">
          🛒
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-amber-300/90">
            Bodega POS
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-400">{subtitle}</p>

      <div
        className="my-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        aria-hidden="true"
      />

      <div>{children}</div>
    </div>
  )
}