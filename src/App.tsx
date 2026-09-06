import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PosLayout } from './layouts/PosLayout'
import { InventoryPage } from './pages/InventoryPage'
import { PosPage } from './pages/PosPage'

function App() {
  return (
    <BrowserRouter>
      <PosLayout>
        <Routes>
          <Route path="/" element={<PosPage />} />
          <Route path="/inventario" element={<InventoryPage />} />
        </Routes>
      </PosLayout>
    </BrowserRouter>
  )
}

export default App