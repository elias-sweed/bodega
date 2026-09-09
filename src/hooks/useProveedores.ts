import { useCallback, useEffect, useState } from 'react'
import { createProveedor, fetchProveedores } from '../services/purchases'
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
      try {
        const data = await fetchProveedores()
        if (!cancelled) {
          setProveedores(data)
        }
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Error al cargar proveedores',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refresh = useCallback((silent = false): void => {
    if (!silent) {
      setLoading(true)
    }
    setError(null)
    setReloadToken((token) => token + 1)
  }, [])

  const addProveedor = useCallback(
    async (input: ProveedoresInsert): Promise<ProveedoresRow> => {
      const created = await createProveedor(input)
      setProveedores((current) => sortByName([...current, created]))
      return created
    },
    [],
  )

  return { proveedores, loading, error, refresh, addProveedor }
}