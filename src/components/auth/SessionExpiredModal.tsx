import { LogOut } from 'lucide-react'

interface SessionExpiredModalProps {
  onAccept: () => void
}

export function SessionExpiredModal({ onAccept }: SessionExpiredModalProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Sesión cerrada"
      className="fade-in fixed inset-0 z-[70] flex items-center justify-center bg-[#0b0420]/85 p-4 backdrop-blur-md"
    >
      <div className="fade-up w-full max-w-sm rounded-[28px] border border-line bg-surface p-6 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/30 bg-amber-400/20 text-amber-200">
          <LogOut size={26} aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-black tracking-tighter text-ink">
          Se cerró tu sesión
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-muted">
          Por seguridad (pasó mucho tiempo o venció tu acceso) te sacamos del
          sistema. No se perdió nada: vuelve a entrar con tu correo y clave.
        </p>
        <button
          type="button"
          onClick={onAccept}
          autoFocus
          className="mt-6 h-12 w-full rounded-2xl border border-line-strong bg-surface-3 text-base font-black tracking-tight text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98]"
        >
          Entendido, volver a entrar
        </button>
      </div>
    </div>
  )
}
