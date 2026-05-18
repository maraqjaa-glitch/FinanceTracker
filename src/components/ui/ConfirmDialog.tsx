import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', destructive = false, loading, onConfirm, onCancel,
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center px-4 pb-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: destructive ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)' }}
          >
            <AlertTriangle
              className="w-5 h-5"
              style={{ color: destructive ? '#ef4444' : 'var(--color-accent)' }}
            />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{title}</p>
            {description && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-11 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: destructive ? '#ef4444' : 'var(--color-accent)' }}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
