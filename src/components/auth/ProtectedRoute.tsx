import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function ProtectedRoute() {
  const { user, loading, rol, roleLoading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const loadingScreen = (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="rounded-3xl bg-white px-10 py-8 text-center shadow-sm">
        <p className="text-lg font-bold text-slate-700">Cargando…</p>
      </div>
    </div>
  )

  if (loading) {
    return loadingScreen
  }

  if (!user) {
    const path = location.pathname + location.search
    return (
      <Navigate to={`/login?redirect=${encodeURIComponent(path)}`} replace />
    )
  }

  if (roleLoading) {
    return loadingScreen
  }

  if (!rol) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <span className="text-4xl" aria-hidden="true">
            🛒
          </span>
          <h1 className="mt-2 text-xl font-black text-slate-900">
            Acceso no autorizado
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            El correo <strong>{user.email}</strong> no está autorizado para
            usar este sistema. Contacta al administrador para solicitar acceso.
          </p>
          <button
            type="button"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true)
              try {
                await signOut()
              } finally {
                setSigningOut(false)
                navigate('/login', { replace: true })
              }
            }}
            className="mt-6 h-14 w-full rounded-2xl bg-slate-900 text-lg font-bold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}