import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl bg-white px-10 py-8 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-700">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    const path = location.pathname + location.search
    return (
      <Navigate to={`/login?redirect=${encodeURIComponent(path)}`} replace />
    )
  }

  return <Outlet />
}