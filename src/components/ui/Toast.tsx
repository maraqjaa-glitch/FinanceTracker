import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useUIStore, type Toast } from '@/store/uiStore'

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const COLORS = {
  success: '#10b981',
  error: '#ef4444',
  info: 'var(--color-accent)',
  warning: '#f59e0b',
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useUIStore()
  const Icon = ICONS[toast.type]

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-2xl shadow-lg w-full max-w-sm animate-slide-up"
      style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: COLORS[toast.type] }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full"
        style={{ color: 'var(--color-text-muted)' }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useUIStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 left-4 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      <div className="flex flex-col gap-2 w-full max-w-sm pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  )
}
