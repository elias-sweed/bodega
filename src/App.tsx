import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminRoute } from './components/auth/AdminRoute'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { SessionExpiredModal } from './components/auth/SessionExpiredModal'
import { AuthLayout } from './layouts/AuthLayout'
import { PosLayout } from './layouts/PosLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HistoryPage } from './pages/HistoryPage'
import { InventoryPage } from './pages/InventoryPage'
import { LoginPage } from './pages/LoginPage'
import { PosPage } from './pages/PosPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { ReportesPage } from './pages/ReportesPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { UsersPage } from './pages/UsersPage'
import { useAuth } from './hooks/useAuth'
import { useEffect } from 'react'

function RecoveryRedirect() {
  const { isPasswordRecovery } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isPasswordRecovery) {
      navigate('/reset-password', { replace: true })
    }
  }, [isPasswordRecovery, navigate])

  return null
}

function SessionExpiredGate() {
  const { sessionExpired, acknowledgeExpired } = useAuth()
  if (!sessionExpired) return null
  return <SessionExpiredModal onAccept={acknowledgeExpired} />
}

function App() {
  return (
    <BrowserRouter>
      <RecoveryRedirect />
      <SessionExpiredGate />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<PosLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/caja" element={<PosPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route
              path="/compras"
              element={
                <AdminRoute>
                  <PurchasesPage />
                </AdminRoute>
              }
            />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/historial" element={<HistoryPage />} />
            <Route
              path="/usuarios"
              element={
                <AdminRoute>
                  <UsersPage />
                </AdminRoute>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App