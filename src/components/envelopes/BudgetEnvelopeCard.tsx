import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import type { BudgetEnvelope } from '@/types'
import { getCategoryName } from '@/types'
import { formatCurrency } from '@/utils/formatCurrency'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

interface Props {
  envelope: BudgetEnvelope & {
    spent_this_month: number
    remaining: number
    usage_percent: number
  }
  onClick?: () => void
}

export default function BudgetEnvelopeCard({ envelope: env, onClick }: Props) {
  const { t } = useTranslation()
  const { language } = useUIStore()
  const { profile } = useAuthStore()
  const currency = profile?.preferred_currency ?? 'PLN'

  const pct = env.usage_percent

  // Colour states: green <70%, amber 70-99%, red ≥100%
  const barColor = pct >= 100 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981'
  const isOver = pct >= 100

  const displayName = env.category
    ? getCategoryName(env.category, language)
    : env.name

  return (
    <button
      type="button"
      onClick={onClick}
      className="card p-4 w-full text-left active:opacity-80 transition-opacity flex flex-col gap-3"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${env.color}22` }}
        >
          {env.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
            {displayName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {env.rollover && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#6366f120', color: '#6366f1' }}
              >
                Rollover
              </span>
            )}
            {isOver && (
              <span
                className="text-[10px] font-semibold"
                style={{ color: '#ef4444' }}
              >
                Over limit!
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      </div>

      {/* Amounts row */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('envelopes.spent')}
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{ color: isOver ? '#ef4444' : 'var(--color-text-primary)' }}
          >
            {formatCurrency(env.spent_this_month, env.currency, language)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('envelopes.monthlyLimit')}
          </p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
            {formatCurrency(env.monthly_limit, env.currency, language)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
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
        <div className="flex justify-between mt-1">
          <p className="text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
            {Math.round(pct)}% used
          </p>
          <p className="text-xs tabular-nums" style={{ color: isOver ? '#ef4444' : 'var(--color-text-muted)' }}>
            {isOver
              ? `${formatCurrency(env.spent_this_month - env.monthly_limit, env.currency, language)} over`
              : `${formatCurrency(env.remaining, env.currency, language)} left`}
          </p>
        </div>
      </div>
    </button>
  )
}
