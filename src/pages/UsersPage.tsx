import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Info, LogOut, RefreshCw, ShieldAlert, UserPlus, Users } from 'lucide-react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { Toast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import {
  crearCuentaConAcceso,
  removeUsuarioAutorizado,
  updateUsuarioRol,
} from '../services/users'
import {
  ensureUsersLoaded,
  getUsersCache,
  refreshUsersCache,
  subscribeToUsers,
} from '../services/usersCache'
import type {
  UsuarioRol,
  UsuariosAutorizadosRow,
} from '../types/database.types'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const inputClass =
  'h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-base font-medium text-ink outline-none placeholder:text-muted/70 focus:border-amber-300/70 focus:bg-surface-3 focus:ring-4 focus:ring-amber-400/10'
const labelClass =
  'mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted'

export function UsersPage() {
  const { rol, user, signOut } = useAuth()
  const isAdmin = rol === 'admin'

  const [usuarios, setUsuarios] = useState<UsuariosAutorizadosRow[]>(() => {
    return getUsersCache().usuarios ?? []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    const cache = getUsersCache()
    return cache.usuarios === null && cache.error === null
  })
  const [error, setError] = useState<string | null>(() => {
    return getUsersCache().error
  })
  const [email, setEmail] = useState('')
  const [nuevoRol, setNuevoRol] = useState<UsuarioRol>('cajero')
  const [saving, setSaving] = useState(false)
  const [noticed, setNoticed] = useState<Notice | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [pendingRemove, setPendingRemove] =
    useState<UsuariosAutorizadosRow | null>(null)
  const [removing, setRemoving] = useState(false)
  const noticeTimer = useRef<number | undefined>(undefined)

  const showNotice = (type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNoticed({ type, message })
    noticeTimer.current = window.setTimeout(() => setNoticed(null), 4500)
  }

  useEffect(() => {
    const update = (): void => {
      const cache = getUsersCache()
      setUsuarios(cache.usuarios ?? [])
      setError(cache.error)
      setLoading(cache.usuarios === null && cache.error === null)
    }
    const unsubscribe = subscribeToUsers(update)
    ensureUsersLoaded()
    return unsubscribe
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(noticeTimer.current)
  }, [])

  if (!isAdmin) {
    return (
      <div className="usuarios-pos mx-auto flex h-full w-full max-w-md flex-col items-center justify-center bg-transparent p-4">
        <div className="fade-up w-full rounded-[28px] border border-line bg-surface p-8 text-center shadow-sm backdrop-blur-2xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-ink">
            <ShieldAlert size={26} aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-black tracking-tighter text-ink">
            Acceso no autorizado
          </h1>
          <p className="mt-2 text-sm font-medium text-muted">
            Solo un administrador puede gestionar los accesos. El correo{' '}
            <strong className="text-ink">{user?.email}</strong> no tiene
            permiso para ver esta página.
          </p>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true)
              void signOut()
            }}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface-2 text-base font-extrabold text-ink backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <LogOut size={18} aria-hidden="true" />
            {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    )
  }

  const adminCount = usuarios.filter((usuario) => usuario.rol === 'admin').length

  const handleAdd = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (saving) return
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      showNotice('error', 'Escribe un correo electrónico.')
      return
    }
    if (usuarios.some((u) => u.email === trimmed)) {
      showNotice('error', 'Ese correo ya tiene acceso.')
      return
    }
    setSaving(true)
    try {
      const { existed } = await crearCuentaConAcceso(trimmed, nuevoRol)
      setEmail('')
      await loadList()
      showNotice(
        'success',
        existed
          ? `${trimmed} ya tenía cuenta: se le dio acceso de ${nuevoRol === 'admin' ? 'Admin' : 'Cajero'}.`
          : `Cuenta creada para ${trimmed} (${nuevoRol === 'admin' ? 'Admin' : 'Cajero'}). Dile que en el login use "Olvidé mi contraseña" para crear su clave.`,
      )
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo crear la cuenta',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleChangeRol = async (usuario: UsuariosAutorizadosRow): Promise<void> => {
    const nuevo: UsuarioRol = usuario.rol === 'admin' ? 'cajero' : 'admin'
    if (usuario.rol === 'admin' && adminCount <= 1) {
      showNotice('error', 'No puedes cambiar el rol del último administrador.')
      return
    }
    try {
      await updateUsuarioRol(usuario.email, nuevo)
      await loadList()
      showNotice(
        'success',
        `${usuario.email} ahora es ${nuevo === 'admin' ? 'Admin' : 'Cajero'}`,
      )
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo cambiar el rol',
      )
    }
  }

  const handleRemove = (usuario: UsuariosAutorizadosRow): void => {
    if (usuario.email === user?.email) {
      showNotice('error', 'No puedes quitarte el acceso a ti mismo.')
      return
    }
    if (usuario.rol === 'admin' && adminCount <= 1) {
      showNotice('error', 'No puedes quitar el acceso del último administrador.')
      return
    }
    setPendingRemove(usuario)
  }

  const confirmRemove = async (): Promise<void> => {
    if (!pendingRemove || removing) return
    const target = pendingRemove
    setRemoving(true)
    try {
      await removeUsuarioAutorizado(target.email)
      await loadList()
      showNotice('success', `Se quitó el acceso a ${target.email}`)
      setPendingRemove(null)
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo quitar el acceso',
      )
    } finally {
      setRemoving(false)
    }
  }

  async function loadList(): Promise<void> {
    await refreshUsersCache()
  }

  return (
    <div className="usuarios-pos mx-auto flex h-full w-full max-w-4xl flex-col gap-6 bg-transparent">
      <header className="flex shrink-0 items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-surface-2 text-amber-300">
          <Users size={22} aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Acceso
          </p>
          <h1 className="mt-0.5 text-3xl font-black tracking-tighter text-ink">
            Usuarios
          </h1>
          <p className="mt-1 text-sm font-medium text-muted">
            Controla quién puede entrar al sistema y con qué rol.
          </p>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-[28px] border border-sky-300/25 bg-surface-2 px-5 py-4">
        <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-sky-200" />
        <p className="text-sm font-medium leading-relaxed text-sky-200">
          <strong className="font-extrabold">Todo se hace aquí:</strong> escribe el
          correo, elige el rol y pulsa el botón: la cuenta se crea sola. Después
          dile a la persona que en el login use{' '}
          <strong className="font-extrabold text-ink">"Olvidé mi contraseña"</strong>{' '}
          para poner su propia clave (que revise spam si no le llega).
        </p>
      </div>

      <section className="fade-up shrink-0 rounded-[28px] border border-line bg-surface p-5 shadow-sm backdrop-blur-2xl sm:p-6">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label htmlFor="usuario-email" className={labelClass}>
                Correo electrónico
              </label>
              <input
                id="usuario-email"
                required
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="nuevocorreo@ejemplo.com"
              />
            </div>
            <div className="sm:min-w-40">
              <label htmlFor="usuario-rol" className={labelClass}>
                Rol
              </label>
              <select
                id="usuario-rol"
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as UsuarioRol)}
                className={`${inputClass} cursor-pointer [&>option]:bg-[#241b66] [&>option]:text-slate-100`}
              >
                <option value="cajero">Cajero</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/40 bg-linear-to-r from-amber-200 via-amber-400 to-amber-600 text-base font-black uppercase tracking-widest text-slate-900 shadow-[0_14px_35px_-12px_rgba(251,191,36,0.6)] transition-colors hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-muted disabled:shadow-none"
          >
            <UserPlus size={18} strokeWidth={2.5} aria-hidden="true" />
            {saving ? 'Creando…' : 'Crear cuenta y dar acceso'}
          </button>
        </form>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-line bg-surface shadow-[0_28px_70px_-38_rgba(0,0,0,0.95)]">
        {loading ? (
          <div className="flex flex-col gap-3 p-5" aria-label="Cargando usuarios">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="skeleton-shimmer h-16 w-full rounded-2xl"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : error ? (
          <div className="m-5 flex flex-col items-center gap-4 rounded-[20px] border border-rose-400/30 bg-rose-400/10 p-8 text-center backdrop-blur-xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/30 text-loss">
              <ShieldAlert size={22} aria-hidden="true" />
            </span>
            <p className="text-base font-extrabold tracking-tight text-ink">
              No se pudo cargar el listado
            </p>
            <p className="text-sm font-medium text-muted">{error}</p>
            <button
              type="button"
              onClick={() => void loadList()}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/40 bg-rose-500 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-rose-400 active:scale-95"
            >
              <RefreshCw size={15} strokeWidth={2.5} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : usuarios.length === 0 ? (
          <div className="m-5 flex flex-col items-center gap-2 rounded-[20px] border border-line bg-surface p-10 text-center backdrop-blur-xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface text-muted">
              <Users size={22} aria-hidden="true" />
            </span>
            <p className="mt-2 text-base font-extrabold tracking-tight text-ink">
              Todavía no hay usuarios con acceso
            </p>
            <p className="text-sm font-medium text-muted">
              Agrega el primer correo con el formulario de arriba.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {usuarios.map((usuario) => (
              <li
                key={usuario.email}
                className="fade-up flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-ink">
                    {usuario.email}
                    {usuario.email === user?.email && (
                      <span className="ml-2 text-xs font-extrabold text-profit">
                        (tú)
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-medium text-muted">
                    Desde{' '}
                    {new Date(usuario.created_at).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                      usuario.rol === 'admin'
                        ? 'border-violet-300/40 bg-violet-400/15 text-violet-200'
                        : 'border-line bg-surface text-muted'
                    }`}
                  >
                    {usuario.rol === 'admin' ? 'Admin' : 'Cajero'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleChangeRol(usuario)}
                    className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-surface-3 active:translate-y-0 active:scale-95"
                  >
                    Cambiar rol
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(usuario)}
                    className="rounded-xl border border-rose-400/40 bg-rose-400/15 px-3 py-1.5 text-xs font-bold text-loss backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-400/30 active:translate-y-0 active:scale-95"
                  >
                    Quitar acceso
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={pendingRemove !== null}
        title={
          pendingRemove
            ? `¿Quitar el acceso a ${pendingRemove.email}?`
            : '¿Quitar el acceso?'
        }
        description="Ese correo ya no podrá entrar."
        confirmLabel={removing ? 'Quitando…' : 'Quitar acceso'}
        cancelLabel="Conservar"
        onConfirm={() => void confirmRemove()}
        onCancel={() => {
          if (!removing) setPendingRemove(null)
        }}
      />

      {noticed && <Toast type={noticed.type} message={noticed.message} />}
    </div>
  )
}
