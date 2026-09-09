import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AuthLayout } from './layouts/AuthLayout'
import { PosLayout } from './layouts/PosLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { HistoryPage } from './pages/HistoryPage'
import { InventoryPage } from './pages/InventoryPage'
import { LoginPage } from './pages/LoginPage'
import { PosPage } from './pages/PosPage'
import { PurchasesPage } from './pages/PurchasesPage'
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

function App() {
  return (
    <BrowserRouter>
      <RecoveryRedirect />
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
            <Route path="/compras" element={<PurchasesPage />} />
            <Route path="/historial" element={<HistoryPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App