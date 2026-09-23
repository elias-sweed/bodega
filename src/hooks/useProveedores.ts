import { useCallback, useEffect, useState } from 'react'
import {
  createProveedor,
  deleteProveedor as deleteProveedorService,
  fetchProveedores,
} from '../services/purchases'
import type { ProveedoresInsert, ProveedoresRow } from '../types/database.types'

function sortByName(proveedores: ProveedoresRow[]): ProveedoresRow[] {
  return [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function useProveedores() {
  const [proveedores, setProveedores] = useState<ProveedoresRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await fetchProveedores()
        if (!cancelled) {
          setProveedores(sortByName(data))
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los proveedores')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refresh = useCallback(() => setReloadToken((token) => token + 1), [])

  const addProveedor = useCallback(async (input: ProveedoresInsert) => {
    const created = await createProveedor(input)
    setProveedores((current) => sortByName([...current, created]))
    return created
  }, [])

  const removeProveedor = useCallback(async (id: string) => {
    await deleteProveedorService(id)
    setProveedores((current) => current.filter((proveedor) => proveedor.id !== id))
  }, [])

  return { proveedores, loading, error, refresh, addProveedor, removeProveedor }
}
