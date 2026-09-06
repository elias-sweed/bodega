import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PosLayout } from './layouts/PosLayout'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryPage } from './pages/InventoryPage'
import { PosPage } from './pages/PosPage'
import { PurchasesPage } from './pages/PurchasesPage'

function App() {
  return (
    <BrowserRouter>
      <PosLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/caja" element={<PosPage />} />
          <Route path="/inventario" element={<InventoryPage />} />
          <Route path="/compras" element={<PurchasesPage />} />
        </Routes>
      </PosLayout>
    </BrowserRouter>
  )
}

export default App