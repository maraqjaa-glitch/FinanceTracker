import { useTranslation } from 'react-i18next'
import { ChevronRight, Target } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import type { SavingsEnvelope } from '@/types'
import { formatCurrency } from '@/utils/formatCurrency'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

interface Props {
  envelope: SavingsEnvelope & { current_balance: number; progress_percent: number | undefined }
  onClick?: () => void
}

export default function SavingsEnvelopeCard({ envelope: env, onClick }: Props) {
  const { t } = useTranslation()
  const { language } = useUIStore()
  const { profile } = useAuthStore()
  const currency = profile?.preferred_currency ?? 'PLN'

  const pct = env.progress_percent ?? 0
  const goalReached = pct >= 100

  // Progress bar colour
  const barColor = goalReached
    ? '#10b981'
    : pct >= 75
    ? '#f59e0b'
    : '#0ea5e9'

  // Days left
  const daysLeft = env.target_date
    ? differenceInDays(parseISO(env.target_date), new Date())
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="card p-4 w-full text-left active:opacity-80 transition-opacity flex flex-col gap-3"
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${env.color}22` }}
        >
          {env.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
            {env.name}
          </p>
          {goalReached ? (
            <span className="text-xs font-medium" style={{ color: '#10b981' }}>
              {t('envelopes.goalReached')}
            </span>
          ) : env.target_date && daysLeft !== null ? (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {daysLeft > 0
                ? t('envelopes.daysLeft', { count: daysLeft })
                : 'Overdue'}
            </p>
          ) : null}
        </div>

        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      </div>

      {/* Amounts */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('envelopes.currentBalance')}
          </p>
          <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {formatCurrency(env.current_balance, env.currency, language)}
          </p>
        </div>
        {env.target_amount && (
          <div className="text-right">
            <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {t('envelopes.targetAmount')}
            </p>
            <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
              {formatCurrency(env.target_amount, env.currency, language)}
            </p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {env.target_amount && (
        <div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
            />
          </div>
          <p className="text-xs mt-1 text-right tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
            {Math.round(pct)}%
          </p>
        </div>
      )}
    </button>
  )
}
