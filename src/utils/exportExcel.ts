import * as XLSX from 'xlsx'

/**
 * Descarga una tabla como archivo Excel (.xlsx) real.
 * `rows` incluye la fila de cabecera como primer elemento.
 */
export function exportExcel(
  rows: (string | number)[][],
  filename: string,
  sheetName = 'Inventario',
): void {
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  // Anchos de columna legibles
  const widths = rows[0]?.map((_, col) =>
    Math.min(
      42,
      Math.max(
        12,
        ...rows.map((row) => String(row[col] ?? '').length + 2),
      ),
    ),
  )
  worksheet['!cols'] = (widths ?? []).map((wch) => ({ wch }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename)
}
