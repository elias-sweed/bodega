import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Upload,
  X,
} from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { emitDataChanged } from '../../services/dataEvents'
import { isDuplicateTicketError, registrarVentaBackfill } from '../../services/sales'
import type { ProductosRow } from '../../types/database.types'

const METODOS_VALIDOS = ['Efectivo', 'Yape', 'Plin'] as const

type Step = 1 | 2 | 3

type ParsedRow = {
  line: number
  ticket: string
  fechaISO: string | null
  fechaLabel: string
  codigo: string
  cantidad: number | null
  precio: number | null
  metodo: string
  productoId: string | null
  productoNombre: string | null
  subtotal: number
  error: string | null
}

type TicketGroup = {
  ticket: string
  fechaISO: string
  fechaLabel: string
  metodo: string
  rows: ParsedRow[]
  validRows: ParsedRow[]
  total: number
  error: string | null
  valid: boolean
}

type ImportResult = {
  ok: number
  duplicados: string[]
  stockNegativo: string[]
  errores: { ticket: string; motivo: string }[]
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatDDMMAAAA(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

type FechaParse = { ok: true; iso: string; label: string } | { ok: false; motivo: string }

function parseFechaHora(fechaRaw: string, horaRaw: string): FechaParse {
  const fecha = fechaRaw.trim()
  const hora = horaRaw.trim()
  const fm = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!fm) return { ok: false, motivo: `Fecha inválida "${fechaRaw}" (usa DD/MM/AAAA)` }
  const dd = Number(fm[1])
  const mm = Number(fm[2])
  const yyyy = Number(fm[3])
  const hm = hora.match(/^(\d{1,2}):(\d{2})$/)
  if (!hm) return { ok: false, motivo: `Hora inválida "${horaRaw}" (usa HH:MM)` }
  const hh = Number(hm[1])
  const mi = Number(hm[2])
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hh > 23 || mi > 59) {
    return { ok: false, motivo: `Fecha/hora inexistente "${fechaRaw} ${horaRaw}"` }
  }
  const probe = new Date(yyyy, mm - 1, dd, hh, mi)
  if (probe.getFullYear() !== yyyy || probe.getMonth() !== mm - 1 || probe.getDate() !== dd) {
    return { ok: false, motivo: `Fecha inexistente "${fechaRaw}"` }
  }
  // ISO con offset de America/Lima
  const iso = `${yyyy}-${pad2(mm)}-${pad2(dd)}T${pad2(hh)}:${pad2(mi)}:00-05:00`
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, motivo: `Fecha inválida "${fechaRaw} ${horaRaw}"` }
  }
  // No futura, con tolerancia hasta el fin de mañana (diferencia horaria)
  const now = new Date()
  const limite = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0)
  if (parsed.getTime() >= limite.getTime()) {
    return { ok: false, motivo: `Fecha futura "${fechaRaw}" (máx. mañana)` }
  }
  return { ok: true, iso, label: `${fecha} ${hora}` }
}

function normalizeMetodo(raw: string): string | null {
  const lower = raw.trim().toLowerCase()
  const found = METODOS_VALIDOS.find((m) => m.toLowerCase() === lower)
  return found ?? null
}

function findProduct(catalog: ProductosRow[], codigo: string): ProductosRow | null {
  const q = codigo.trim()
  if (!q) return null
  const byCode = catalog.find((p) => (p.codigo_barras ?? '').trim() === q)
  if (byCode) return byCode
  const lower = q.toLowerCase()
  return catalog.find((p) => p.nombre.trim().toLowerCase() === lower) ?? null
}

function parseCSV(text: string, catalog: ProductosRow[]): ParsedRow[] {
  const clean = text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  const lines = clean.split('\n')
  const rows: ParsedRow[] = []
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    if (!line) return
    if (idx === 0 && /ticket/i.test(line)) return
    const parts = line.split(';').map((p) => p.trim())
    const ticket = parts[0] ?? ''
    const fechaRaw = parts[1] ?? ''
    const horaRaw = parts[2] ?? ''
    const codigo = parts[3] ?? ''
    const cantidadRaw = parts[4] ?? ''
    const precioRaw = parts[5] ?? ''
    const metodoRaw = parts[6] ?? ''
    const lineNo = idx + 1

    const base: ParsedRow = {
      line: lineNo,
      ticket,
      fechaISO: null,
      fechaLabel: [fechaRaw, horaRaw].filter(Boolean).join(' '),
      codigo,
      cantidad: null,
      precio: null,
      metodo: metodoRaw,
      productoId: null,
      productoNombre: null,
      subtotal: 0,
      error: null,
    }

    if (!ticket) {
      rows.push({ ...base, error: `Línea ${lineNo}: ticket vacío` })
      return
    }

    const fecha = parseFechaHora(fechaRaw, horaRaw)
    if (!fecha.ok) {
      rows.push({ ...base, error: `Línea ${lineNo}: ${fecha.motivo}` })
      return
    }

    const product = findProduct(catalog, codigo)
    if (!product) {
      rows.push({ ...base, error: `Línea ${lineNo}: producto "${codigo}" no encontrado` })
      return
    }

    if (!/^\d+$/.test(cantidadRaw)) {
      rows.push({ ...base, error: `Línea ${lineNo}: cantidad inválida "${cantidadRaw}" (entero ≥ 1)` })
      return
    }
    const cantidad = Number(cantidadRaw)
    if (cantidad < 1) {
      rows.push({ ...base, error: `Línea ${lineNo}: cantidad debe ser ≥ 1` })
      return
    }

    const precio = Number(precioRaw.replace(',', '.'))
    if (!Number.isFinite(precio) || precio < 0) {
      rows.push({ ...base, error: `Línea ${lineNo}: precio inválido "${precioRaw}" (≥ 0)` })
      return
    }

    const metodo = normalizeMetodo(metodoRaw)
    if (!metodo) {
      rows.push({ ...base, error: `Línea ${lineNo}: método "${metodoRaw}" inválido (Efectivo/Yape/Plin)` })
      return
    }

    rows.push({
      ...base,
      fechaISO: fecha.iso,
      fechaLabel: fecha.label,
      cantidad,
      precio,
      metodo,
      productoId: product.id,
      productoNombre: product.nombre,
      subtotal: cantidad * precio,
    })
  })
  return rows
}

function groupByTicket(rows: ParsedRow[]): TicketGroup[] {
  const map = new Map<string, ParsedRow[]>()
  for (const row of rows) {
    const list = map.get(row.ticket)
    if (list) list.push(row)
    else map.set(row.ticket, [row])
  }
  return [...map.entries()].map(([ticket, ticketRows]) => {
    const validRows = ticketRows.filter((r) => r.error === null && r.fechaISO !== null)
    const metodos = new Set(validRows.map((r) => r.metodo))
    let error: string | null = null
    if (validRows.length === 0) {
      error = 'Todas las filas tienen errores'
    } else if (metodos.size > 1) {
      error = 'El ticket mezcla métodos de pago'
    }
    const first = validRows[0]
    const total = validRows.reduce((acc, r) => acc + r.subtotal, 0)
    return {
      ticket,
      fechaISO: first?.fechaISO ?? '',
      fechaLabel: first?.fechaLabel ?? ticketRows[0]?.fechaLabel ?? '',
      metodo: metodos.size === 1 ? (first?.metodo ?? '') : [...metodos].join(', '),
      rows: ticketRows,
      validRows,
      total,
      error,
      valid: error === null,
    }
  })
}

function downloadTemplate(): void {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const lines = [
    'ticket;fecha;hora;codigo;cantidad;precio;metodo',
    `T-001;${formatDDMMAAAA(weekAgo)};10:15;Gaseosa 500ml;2;3.50;Efectivo`,
    `T-001;${formatDDMMAAAA(weekAgo)};10:15;7501234567890;1;12.00;Efectivo`,
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_ventas_offline.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const STEPS = ['Archivo', 'Revisar', 'Resultado'] as const

export function ImportVentasModal({ onClose }: { onClose: () => void }) {
  const { products, loading: catalogLoading, refresh: refreshProductos } = useProducts()
  const [step, setStep] = useState<Step>(1)
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const groups = useMemo(() => groupByTicket(rows), [rows])
  const validGroups = useMemo(() => groups.filter((g) => g.valid), [groups])
  const errorCount = useMemo(() => rows.filter((r) => r.error !== null).length, [rows])

  async function handleFile(file: File): Promise<void> {
    setFileError(null)
    if (!catalogLoading && products.length === 0) {
      setFileError('Sin catálogo de productos: no se puede validar el archivo. Revisa tu conexión e inténtalo de nuevo.')
      return
    }
    try {
      const text = await file.text()
      const parsed = parseCSV(text, products)
      if (parsed.length === 0) {
        setFileError('El archivo no tiene filas para importar. Descarga la plantilla y sigue su formato.')
        return
      }
      setFileName(file.name)
      setRows(parsed)
      setResult(null)
      setStep(2)
    } catch {
      setFileError('No se pudo leer el archivo. Debe ser un .csv con separador ";".')
    }
  }

  async function handleConfirm(): Promise<void> {
    if (validGroups.length === 0 || importing) return
    setImporting(true)
    const res: ImportResult = { ok: 0, duplicados: [], stockNegativo: [], errores: [] }
    const negSet = new Set<string>()
    for (const group of validGroups) {
      const items = group.validRows.map((r) => ({
        producto_id: r.productoId ?? '',
        cantidad: r.cantidad ?? 0,
        precio_unitario: r.precio ?? 0,
      }))
      try {
        const out = await registrarVentaBackfill(items, group.metodo, group.fechaISO, group.ticket)
        res.ok += 1
        if (out.stock_negativo) {
          for (const r of group.validRows) {
            if (r.productoNombre) negSet.add(r.productoNombre)
          }
        }
      } catch (cause) {
        if (isDuplicateTicketError(cause)) {
          res.duplicados.push(group.ticket)
        } else {
          res.errores.push({
            ticket: group.ticket,
            motivo: cause instanceof Error ? cause.message : 'Error desconocido',
          })
        }
      }
    }
    res.stockNegativo = [...negSet]
    setResult(res)
    setImporting(false)
    refreshProductos(true)
    emitDataChanged()
    setStep(3)
  }

  function reset(): void {
    setStep(1)
    setFileName('')
    setRows([])
    setFileError(null)
    setResult(null)
  }

  return (
    <div
      className="fade-in fixed inset-0 z-30 flex items-center justify-center bg-[#0b0420]/85 p-4 backdrop-blur-md"
      onClick={() => {
        if (!importing) onClose()
      }}
    >
      <div
        className="fade-up max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-line bg-surface p-6 shadow-sm backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Importar ventas offline"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
              Regularizar ventas sin internet
            </p>
            <h2 className="mt-0.5 text-xl font-black tracking-tighter text-ink">
              Importar Excel
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-all duration-200 hover:bg-surface-3 hover:text-ink disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <ol className="mt-4 flex items-center gap-2" aria-label="Pasos de importación">
          {STEPS.map((label, idx) => {
            const n = (idx + 1) as Step
            const active = step === n
            const done = step > n
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    done
                      ? 'border border-emerald-200/40 bg-emerald-400/80 text-ink'
                      : active
                        ? 'border border-line-strong bg-surface-3 text-ink'
                        : 'border border-line bg-surface-sub text-muted'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} aria-hidden="true" /> : n}
                </span>
                <span className={`text-xs font-bold ${active ? 'text-ink' : 'text-muted'}`}>
                  {n}. {label}
                </span>
                {idx < STEPS.length - 1 && <span className="h-px flex-1 bg-surface-2" aria-hidden="true" />}
              </li>
            )
          })}
        </ol>

        {step === 1 && (
          <div className="mt-5">
            <p className="text-sm text-muted">
              Descarga la plantilla, registra ahí las ventas hechas sin internet
              (una fila por producto, mismo <span className="font-bold text-ink">ticket</span> por
              venta) y súbela como .csv.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-black text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98]"
              >
                <Download size={16} aria-hidden="true" />
                Descargar plantilla
              </button>
              <label
                className={`inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-200/30 bg-emerald-500 px-4 text-sm font-black text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] ${
                  catalogLoading ? 'cursor-wait opacity-60' : ''
                }`}
              >
                <Upload size={16} aria-hidden="true" />
                {catalogLoading ? 'Cargando catálogo…' : 'Elegir archivo .csv'}
                <input
                  type="file"
                  accept=".csv"
                  disabled={catalogLoading}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void handleFile(file)
                  }}
                />
              </label>
            </div>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted">
              ticket;fecha;hora;codigo;cantidad;precio;metodo — fecha DD/MM/AAAA, hora HH:MM,
              código = código de barras o nombre exacto del producto.
            </p>
            {fileError && (
              <p className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200/30 bg-rose-500/20 px-4 py-3 text-sm font-bold text-loss">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                {fileError}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-5">
            <p className="text-sm text-muted">
              <span className="font-bold text-ink">{fileName || 'Archivo'}</span> —{' '}
              {groups.length} ticket(s), {rows.length} fila(s)
              {errorCount > 0 && (
                <span className="font-bold text-loss">, {errorCount} con error</span>
              )}
              .
            </p>
            <div className="mt-3 flex max-h-[40vh] flex-col gap-2 overflow-y-auto pr-1">
              {groups.map((group) => (
                <div
                  key={group.ticket}
                  className={`rounded-2xl border p-3 backdrop-blur-xl ${
                    group.valid
                      ? 'border-emerald-200/30 bg-emerald-400/10'
                      : 'border-rose-200/30 bg-rose-500/10'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black text-ink">
                      Ticket {group.ticket}
                    </span>
                    <span className="text-xs font-bold text-muted">
                      {group.fechaLabel} · {group.validRows.length}/{group.rows.length} ítems ·{' '}
                      {group.metodo || '—'} · S/ {group.total.toFixed(2)}
                    </span>
                  </div>
                  {group.error && (
                    <p className="mt-1 text-xs font-bold text-loss">{group.error}</p>
                  )}
                  <ul className="mt-2 flex flex-col gap-1">
                    {group.rows.map((row) => (
                      <li
                        key={`${row.line}`}
                        className={`rounded-xl px-2.5 py-1.5 text-xs ${
                          row.error
                            ? 'border border-rose-200/25 bg-rose-500/15 font-bold text-loss'
                            : 'border border-line bg-surface-sub text-muted'
                        }`}
                      >
                        {row.error ?? (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="shrink-0 text-profit" aria-hidden="true" />
                            {row.productoNombre} × {row.cantidad} @ S/ {(row.precio ?? 0).toFixed(2)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={reset}
                disabled={importing}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 text-sm font-black text-ink backdrop-blur-xl transition-all duration-300 hover:bg-surface-3 active:scale-[0.98] disabled:opacity-40"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={validGroups.length === 0 || importing}
                className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl border border-emerald-200/30 bg-emerald-500 px-4 text-sm font-black tracking-widest text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-muted disabled:shadow-none disabled:hover:translate-y-0"
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    IMPORTANDO…
                  </>
                ) : (
                  <>CONFIRMAR ({validGroups.length} TICKET(S))</>
                )}
              </button>
            </div>
            {validGroups.length === 0 && (
              <p className="mt-2 text-xs font-bold text-loss">
                No hay tickets válidos para importar. Corrige el archivo e inténtalo de nuevo.
              </p>
            )}
          </div>
        )}

        {step === 3 && result && (
          <div className="mt-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-emerald-200/30 bg-emerald-400/15 p-3 text-center backdrop-blur-xl">
                <p className="text-2xl font-black text-profit">{result.ok}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Importadas</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-3 text-center backdrop-blur-xl">
                <p className="text-2xl font-black text-ink">{result.duplicados.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Duplicadas</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-3 text-center backdrop-blur-xl">
                <p className="text-2xl font-black text-ink">{result.stockNegativo.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Stock negat.</p>
              </div>
              <div className="rounded-2xl border border-rose-200/30 bg-rose-500/15 p-3 text-center backdrop-blur-xl">
                <p className="text-2xl font-black text-loss">{result.errores.length}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Errores</p>
              </div>
            </div>

            {result.duplicados.length > 0 && (
              <p className="mt-3 rounded-2xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-muted backdrop-blur-xl">
                <FileText size={13} className="mr-1.5 inline" aria-hidden="true" />
                Omitidas por duplicadas: {result.duplicados.join(', ')}
              </p>
            )}
            {result.stockNegativo.length > 0 && (
              <p className="mt-2 rounded-2xl border border-rose-200/30 bg-rose-500/15 px-4 py-2.5 text-xs font-bold text-loss">
                <AlertTriangle size={13} className="mr-1.5 inline" aria-hidden="true" />
                Stock en negativo, sincerar inventario: {result.stockNegativo.join(', ')}
              </p>
            )}
            {result.errores.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {result.errores.map((e) => (
                  <li
                    key={e.ticket}
                    className="rounded-xl border border-rose-200/25 bg-rose-500/15 px-3 py-2 text-xs font-bold text-loss"
                  >
                    Ticket {e.ticket}: {e.motivo}
                  </li>
                ))}
              </ul>
            )}
            {result.ok === 0 && result.duplicados.length === 0 && result.errores.length === 0 && (
              <p className="mt-2 text-xs font-bold text-muted">Sin cambios.</p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-4 h-12 w-full rounded-2xl border border-emerald-200/30 bg-emerald-500 text-sm font-black tracking-[0.2em] text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98]"
            >
              CERRAR
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
