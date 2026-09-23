function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value)
  let text = value
  if (/^[=+@]/.test(text) || /^-\D/.test(text)) text = `'${text}`
  if (/[";\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function exportCsv(
  rows: (string | number)[][],
  filename: string,
): void {
  const content = rows
    .map((row) => row.map(csvCell).join(';'))
    .join('\r\n')
  const blob = new Blob(['\uFEFF', content], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
