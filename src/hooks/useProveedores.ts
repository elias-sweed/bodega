import { useCallback, useEffect, useState } from 'react'
import {
  createProveedor,
  deleteProveedor as deleteProveedorService,
} from '../services/purchases'
import {
  ensureProveedoresLoaded,
  getProveedoresCache,
  refreshProveedoresCache,
  subscribeToProveedores,
  applyProveedorChanges,
} from '../services/proveedoresCache'
import type { ProveedoresInsert, ProveedoresRow } from '../types/database.types'

export function useProveedores() {
  const [proveedores, setProveedores] = useState<ProveedoresRow[]>(() => {
    return getProveedoresCache().proveedores ?? []
  })
  const [loading, setLoading] = useState<boolean>(() => {
    return getProveedoresCache().proveedores === null
  })
  const [error, setError] = useState<string | null>(() => {
    return getProveedoresCache().error
  })

  useEffect(() => {
    const update = (): void => {
      const data = getProveedoresCache()
      setProveedores(data.proveedores ?? [])
      setError(data.error)
      setLoading(data.proveedores === null)
    }
    const unsubscribe = subscribeToProveedores(update)
    ensureProveedoresLoaded()
    return unsubscribe
  }, [])

  const refresh = useCallback((): void => {
    setLoading(getProveedoresCache().proveedores === null)
    void refreshProveedoresCache()
  }, [])

  const addProveedor = useCallback(async (input: ProveedoresInsert) => {
    const created = await createProveedor(input)
    const current = getProveedoresCache().proveedores ?? []
    applyProveedorChanges([...current, created])
    await refreshProveedoresCache()
    return created
  }, [])

  const removeProveedor = useCallback(async (id: string) => {
    await deleteProveedorService(id)
    const current = getProveedoresCache().proveedores ?? []
    applyProveedorChanges(current.filter((proveedor) => proveedor.id !== id))
    await refreshProveedoresCache()
  }, [])

  return { proveedores, loading, error, refresh, addProveedor, removeProveedor }
}