import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Toast } from '../components/common/Toast'
import { useAuth } from '../hooks/useAuth'
import {
  addUsuarioAutorizado,
  fetchUsuariosAutorizados,
  removeUsuarioAutorizado,
  updateUsuarioRol,
} from '../services/users'
import type {
  UsuarioRol,
  UsuariosAutorizadosRow,
} from '../types/database.types'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const inputClass =
  'h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700'

export function UsersPage() {
  const { rol, user, signOut } = useAuth()
  const isAdmin = rol === 'admin'

  const [usuarios, setUsuarios] = useState<UsuariosAutorizadosRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [nuevoRol, setNuevoRol] = useState<UsuarioRol>('cajero')
  const [saving, setSaving] = useState(false)
  const [noticed, setNoticed] = useState<Notice | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const noticeTimer = useRef<number | undefined>(undefined)

  const showNotice = (type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNoticed({ type, message })
    noticeTimer.current = window.setTimeout(() => setNoticed(null), 4500)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchUsuariosAutorizados()
        if (!cancelled) {
          setUsuarios(data)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar el listado',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
      window.clearTimeout(noticeTimer.current)
    }
  }, [])

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <span className="text-4xl" aria-hidden="true">
            🛒
          </span>
          <h1 className="mt-2 text-xl font-black text-slate-900">
            Acceso no autorizado
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Solo un administrador puede gestionar los accesos. El correo{' '}
            <strong>{user?.email}</strong> no tiene permiso para ver esta página.
          </p>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true)
              void signOut()
            }}
            className="mt-6 h-14 w-full rounded-2xl bg-slate-900 text-lg font-bold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    )
  }

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
      await addUsuarioAutorizado(trimmed, nuevoRol)
      setEmail('')
      await loadList()
      showNotice('success', `Acceso otorgado a ${trimmed}`)
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo otorgar el acceso',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleChangeRol = async (usuario: UsuariosAutorizadosRow): Promise<void> => {
    const nuevo: UsuarioRol = usuario.rol === 'admin' ? 'cajero' : 'admin'
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

  const handleRemove = async (usuario: UsuariosAutorizadosRow): Promise<void> => {
    if (usuario.email === user?.email) {
      showNotice('error', 'No puedes quitarte el acceso a ti mismo.')
      return
    }
    const ok = window.confirm(
      `¿Quitar el acceso a ${usuario.email}?\nEse correo ya no podrá entrar al sistema.`,
    )
    if (!ok) return
    try {
      await removeUsuarioAutorizado(usuario.email)
      await loadList()
      showNotice('success', `Se quitó el acceso a ${usuario.email}`)
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo quitar el acceso',
      )
    }
  }

  async function loadList(): Promise<void> {
    try {
      const data = await fetchUsuariosAutorizados()
      setUsuarios(data)
      setError(null)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo cargar el listado',
      )
    }
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <header className="shrink-0">
        <h1 className="text-2xl font-black text-slate-900">Usuarios</h1>
        <p className="mt-1 text-sm text-slate-500">
          Controla quién puede entrar al sistema y con qué rol. Esta página solo
          es visible para administradores.
        </p>
      </header>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
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
            <div>
              <label htmlFor="usuario-rol" className={labelClass}>
                Rol
              </label>
              <select
                id="usuario-rol"
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as UsuarioRol)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="cajero">Cajero</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-12 w-full rounded-xl bg-indigo-600 text-base font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {saving ? 'Agregando…' : 'Agregar acceso'}
          </button>
        </form>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-3xl bg-white shadow-sm">
        {loading ? (
          <p className="py-10 text-center text-slate-400">Cargando usuarios…</p>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="font-semibold text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => void loadList()}
              className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
            >
              Reintentar
            </button>
          </div>
        ) : usuarios.length === 0 ? (
          <p className="py-10 text-center text-slate-400">
            Todavía no hay usuarios con acceso.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {usuarios.map((usuario) => (
              <li
                key={usuario.email}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">
                    {usuario.email}
                    {usuario.email === user?.email && (
                      <span className="ml-2 text-xs font-bold text-indigo-500">
                        (tú)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    Desde{' '}
                    {new Date(usuario.created_at).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      usuario.rol === 'admin'
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {usuario.rol === 'admin' ? 'Admin' : 'Cajero'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleChangeRol(usuario)}
                    className="rounded-lg border-2 border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Cambiar rol
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(usuario)}
                    className="rounded-lg border-2 border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    Quitar acceso
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {noticed && <Toast type={noticed.type} message={noticed.message} />}
    </div>
  )
}