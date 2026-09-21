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

const PROVEEDORES_CACHE_KEY = 'bodega:proveedores-cache:v1'

function readProveedoresCache(): ProveedoresRow[] {
  try {
    const raw = localStorage.getItem(PROVEEDORES_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { proveedores: ProveedoresRow[] }
    return Array.isArray(parsed?.proveedores) ? parsed.proveedores : []
  } catch {
    return []
  }
}

function writeProveedoresCache(proveedores: ProveedoresRow[]): void {
  try {
    localStorage.setItem(
      PROVEEDORES_CACHE_KEY,
      JSON.stringify({ proveedores, savedAt: Date.now() }),
    )
  } catch {
    // almacenamiento lleno o bloqueado: no es crítico
  }
}

export function useProveedores() {
  const [proveedores, setProveedores] = useState<ProveedoresRow[]>(() => readProveedoresCache())
  const [loading, setLoading] = useState(() => readProveedoresCache().length === 0)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const data = await fetchProveedores()
        if (!cancelled) {
          setProveedores(data)
          writeProveedoresCache(data)
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
    if (!silent && readProveedoresCache().length === 0) {
      setLoading(true)
    }
    setError(null)
    setReloadToken((token) => token + 1)
  }, [])

  const addProveedor = useCallback(
    async (input: ProveedoresInsert): Promise<ProveedoresRow> => {
      const created = await createProveedor(input)
      setProveedores((current) => {
        const next = sortByName([...current, created])
        writeProveedoresCache(next)
        return next
      })
      return created
    },
    [],
  )

  const removeProveedor = useCallback(async (id: string): Promise<void> => {
    await deleteProveedorService(id)
    setProveedores((current) => {
      const next = current.filter((proveedor) => proveedor.id !== id)
      writeProveedoresCache(next)
      return next
    })
  }, [])

  return { proveedores, loading, error, refresh, addProveedor, removeProveedor }
}