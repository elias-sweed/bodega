import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Silk from '../Silk'
import { useAuth } from '../../hooks/useAuth'

export function ProtectedRoute() {
  const { user, loading, rol, roleLoading, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  const loadingScreen = (
    <div className="relative flex h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        <Silk
          speed={5}
          scale={1}
          color="#5227FF"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>
      <div className="absolute inset-0 bg-[#0b0420]/85 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fade-in relative flex flex-col items-center gap-4 rounded-[28px] border border-line bg-surface px-12 py-10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        <Loader2 size={44} className="animate-spin text-ink" aria-hidden="true" />
        <p className="text-lg font-black tracking-tight text-ink">Cargando…</p>
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
          <p className="mt-2 text-sm text-muted/70">
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
            className="mt-6 h-14 w-full rounded-2xl bg-slate-900 text-lg font-bold text-ink transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
