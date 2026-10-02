import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, X } from 'lucide-react'
import BorderGlow from '../reactbits/BorderGlow'

interface HelpTipProps {
  /** Título corto, ej. "Cargar inventario inicial" */
  title: string
  /** Explicación en palabras simples, sin términos técnicos */
  text: string
  /** Ejemplo concreto con la vida de la bodega */
  example?: string
  /** Texto pequeño junto al botón, ej. "¿Cómo funciona?" */
  label?: string
}

/**
 * Botón de ayuda "?" que muestra una explicación corta y un ejemplo.
 * Pensado para que la dueña entienda cada parte sin que estemos ahí.
 * La tarjeta se dibuja encima de todo (portal) para que no quede cortada.
 */
export function HelpTip({ title, text, example, label }: HelpTipProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const cardWidth = 288
      let left = rect.left + rect.width / 2 - cardWidth / 2
      left = Math.max(8, Math.min(left, window.innerWidth - cardWidth - 8))
      setPos({ top: rect.bottom + 8, left })
    }
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node
      if (
        !buttonRef.current?.contains(target) &&
        !cardRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <span className="inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Ayuda: ${title}`}
        aria-expanded={open}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-amber-300/60 hover:text-amber-300 active:scale-95"
      >
        <HelpCircle size={14} aria-hidden="true" />
      </button>
      {label && (
        <span className="ml-1.5 text-xs font-bold text-muted">{label}</span>
      )}
      {open &&
        pos &&
        createPortal(
          <div
            ref={cardRef}
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[100] w-72"
          >
            <BorderGlow
              edgeSensitivity={30}
              glowColor="40 80 80"
              backgroundColor="#120F17"
              borderRadius={20}
              glowRadius={30}
              glowIntensity={1}
              coneSpread={25}
              animated={true}
              colors={['#c084fc', '#f472b6', '#38bdf8']}
            >
            <div className="p-4 text-left">
              <div className="flex items-start justify-between gap-2">
                <span className="text-base font-black uppercase tracking-wide text-amber-200">
                  {title}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar ayuda"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-200">
                {text}
              </p>
              {example && (
                <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm font-bold text-amber-200">
                  Ejemplo: {example}
                </p>
              )}
            </div>
            </BorderGlow>
          </div>,
          document.body,
        )}
    </span>
  )
}
