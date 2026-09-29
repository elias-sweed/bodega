import { supabase } from './supabase'

const PAGE_SIZE = 1000

/**
 * Ejecuta una consulta Supabase con paginación automática.
 * Si hay más de 1000 registros, hace múltiples peticiones para traerlos todos.
 * Supabase tiene un límite de 1000 filas por consulta — esta función lo resuelve
 * haciendo tantas peticiones como sean necesarias.
 */
export async function fetchAllPages<T>(
  buildQuery: (offset: number, limit: number) => ReturnType<typeof supabase.from>,
): Promise<T[]> {
  const allRows: T[] = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const query = buildQuery(offset, PAGE_SIZE)
    const { data, error } = await query

    if (error) {
      throw error
    }

    const rows = (data ?? []) as T[]
    allRows.push(...rows)

    if (rows.length < PAGE_SIZE) {
      hasMore = false
    } else {
      offset += PAGE_SIZE
    }
  }

  return allRows
}
