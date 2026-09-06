import { useCallback, useEffect, useRef, useState } from 'react'
import { Toast } from '../components/common/Toast'
import { CostoStep } from '../components/purchases/CostoStep'
import { ProductoSelect } from '../components/purchases/ProductoSelect'
import { ProveedorSelect } from '../components/purchases/ProveedorSelect'
import { StepIndicator } from '../components/purchases/StepIndicator'
import { useProducts } from '../hooks/useProducts'
import { useProveedores } from '../hooks/useProveedores'
import { registrarIngreso } from '../services/purchases'

const STEPS = [
  { label: 'Proveedor' },
  { label: 'Producto' },
  { label: 'Cantidad y costo' },
]

type Notice = {
  type: 'success' | 'error'
  message: string
}

export function PurchasesPage() {
  const { proveedores, loading: proveedoresLoading, error: proveedoresError, refresh: refreshProveedores } =
    useProveedores()
  const { products: productos, refresh: refreshProductos } = useProducts()

  const [step, setStep] = useState(1)
  const [proveedorId, setProveedorId] = useState('')
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [costoTotal, setCostoTotal] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  const showNotice = useCallback((type: Notice['type'], message: string): void => {
    window.clearTimeout(noticeTimer.current)
    setNotice({ type, message })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(noticeTimer.current)
  }, [])

  const selectedProducto = productos.find((producto) => producto.id === productoId) ?? null

  const resetForm = (): void => {
    setStep(1)
    setProveedorId('')
    setProductoId('')
    setCantidad('')
    setCostoTotal('')
  }

  const canGoNext = () =>
    (step === 1 && proveedorId !== '') ||
    (step === 2 && productoId !== '') ||
    (step === 3 && cantidad !== '' && costoTotal !== '')

  const handleNext = (): void => {
    if (step < STEPS.length) {
      setStep((current) => current + 1)
    }
  }

  const handleBack = (): void => {
    if (step > 1) {
      setStep((current) => current - 1)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!selectedProducto || saving) return
    setSaving(true)
    try {
      const result = await registrarIngreso({
        p_proveedor_id: proveedorId,
        p_producto_id: productoId,
        p_cantidad: Number(cantidad),
        p_costo_total: Number(costoTotal),
      })
      const nombreProducto = selectedProducto.nombre
      showNotice(
        'success',
        `${cantidad} unidades de ${nombreProducto} registradas (stock: ${result.stock_actual})`,
      )
      resetForm()
      refreshProductos(true)
    } catch (cause) {
      showNotice(
        'error',
        cause instanceof Error ? cause.message : 'No se pudo registrar el ingreso',
      )
    } finally {
      setSaving(false)
    }
  }

  const stepContent = () => {
    switch (step) {
      case 1:
        return (
          <ProveedorSelect
            proveedores={proveedores}
            value={proveedorId}
            onChange={setProveedorId}
          />
        )
      case 2:
        return (
          <ProductoSelect
            productos={productos}
            value={productoId}
            onChange={setProductoId}
          />
        )
      case 3:
        return (
          <CostoStep
            cantidad={cantidad}
            costoTotal={costoTotal}
            onCantidadChange={setCantidad}
            onCostoChange={setCostoTotal}
          />
        )
    }
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <header>
        <h1 className="text-2xl font-black text-slate-900">Compras</h1>
        <p className="text-sm text-slate-500">
          Registra el ingreso de mercadería a tu bodega para sumar stock.
        </p>
      </header>

      {proveedoresLoading ? (
        <p className="py-10 text-center text-lg text-slate-400">Cargando proveedores…</p>
      ) : proveedoresError ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-rose-50 p-8 text-center">
          <p className="text-lg font-semibold text-rose-700">
            No se pudieron cargar los proveedores: {proveedoresError}
          </p>
          <button
            type="button"
            onClick={() => refreshProveedores()}
            className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-3xl bg-white p-6 shadow-sm">
          <StepIndicator current={step} steps={STEPS} />

          <div className="min-h-[180px]">{stepContent()}</div>

          {step === 2 && productos.length === 0 && (
            <p className="text-center text-sm text-slate-400">
              Primero registra productos en Inventario para poder ingresar mercadería.
            </p>
          )}

          <div className="flex justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              disabled={step === 1}
              onClick={handleBack}
              className="w-32 h-14 rounded-2xl bg-slate-100 text-lg font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Atrás
            </button>

            {step < STEPS.length ? (
              <button
                type="button"
                disabled={!canGoNext()}
                onClick={handleNext}
                className="w-32 h-14 rounded-2xl bg-sky-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                disabled={!canGoNext() || saving}
                onClick={() => void handleSave()}
                className="h-14 w-40 rounded-2xl bg-emerald-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {saving ? 'Guardando…' : 'Guardar ingreso'}
              </button>
            )}
          </div>
        </div>
      )}

      {notice && <Toast type={notice.type} message={notice.message} />}
    </div>
  )
}