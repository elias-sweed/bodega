import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { rol } = useAuth()
  if (rol !== 'admin') return <Navigate to="/" replace />
  return children
}
