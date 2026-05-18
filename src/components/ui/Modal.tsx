import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** 'sheet' slides up from bottom (mobile), 'center' is a centred dialog */
  variant?: 'sheet' | 'center'
}

export default function Modal({ open, onClose, title, children, variant = 'sheet' }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && open && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div
        className={
          variant === 'sheet'
            ? 'absolute bottom-0 left-0 right-0 max-h-[90dvh] rounded-t-3xl overflow-hidden flex flex-col max-w-lg mx-auto w-full animate-slide-up'
            : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md rounded-2xl overflow-hidden flex flex-col animate-fade-in'
        }
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {title && (
            <h2 className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-xl"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll area */}
        <div className="overflow-y-auto flex-1 px-5 py-4 pb-safe">
          {children}
        </div>
      </div>
    </div>
  )
}
