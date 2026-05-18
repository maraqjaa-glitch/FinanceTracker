import { useTranslation } from 'react-i18next'
import { ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import type { InvestmentPortfolio, PortfolioValuation } from '@/types'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { useUIStore } from '@/store/uiStore'

const TYPE_LABELS: Record<string, string> = {
  stocks: 'Stocks', crypto: 'Crypto', gold: 'Gold',
  bonds: 'Bonds', real_estate: 'Real Estate', pension: 'Pension', other: 'Other',
}

interface Props {
  portfolio: InvestmentPortfolio & { total_deposited: number }
  latestValuation?: PortfolioValuation
  onClick?: () => void
}

export default function PortfolioCard({ portfolio: p, latestValuation, onClick }: Props) {
  const { t } = useTranslation()
  const { language } = useUIStore()

  const currentValue  = latestValuation?.current_value ?? undefined
  const gainLoss      = currentValue !== undefined ? currentValue - p.total_deposited : undefined
  const returnPct     = p.total_deposited > 0 && gainLoss !== undefined
    ? (gainLoss / p.total_deposited) * 100
    : undefined

  const isPositive = gainLoss !== undefined ? gainLoss >= 0 : undefined
  const gainColor  = isPositive === true ? '#10b981' : isPositive === false ? '#ef4444' : 'var(--color-text-muted)'

  return (
    <button
      type="button"
      onClick={onClick}
      className="card p-4 w-full text-left flex flex-col gap-3 active:opacity-80 transition-opacity"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${p.color}22` }}
        >
          {p.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
            {p.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${p.color}20`, color: p.color }}
            >
              {t(`portfolios.types.${p.type}`)}
            </span>
            {p.institution && (
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                {p.institution}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
      </div>

      {/* Stats row */}
      <div className="flex gap-4">
        {/* Deposited */}
        <div className="flex-1">
          <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('portfolios.totalDeposited')}
          </p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
            {formatCurrency(p.total_deposited, p.currency, language)}
          </p>
        </div>

        {/* Current value */}
        <div className="flex-1">
          <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {t('portfolios.currentValue')}
          </p>
          <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {currentValue !== undefined
              ? formatCurrency(currentValue, p.currency, language)
              : '—'}
          </p>
        </div>

        {/* Return */}
        {gainLoss !== undefined && (
          <div className="flex-1 text-right">
            <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {t('portfolios.gainLoss')}
            </p>
            <div className="flex items-center justify-end gap-1">
              {isPositive
                ? <TrendingUp className="w-3 h-3" style={{ color: gainColor }} />
                : <TrendingDown className="w-3 h-3" style={{ color: gainColor }} />
              }
              <p className="text-sm font-bold tabular-nums" style={{ color: gainColor }}>
                {returnPct !== undefined ? `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%` : ''}
              </p>
            </div>
            <p className="text-[10px] tabular-nums" style={{ color: gainColor }}>
              {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss, p.currency, language)}
            </p>
          </div>
        )}
      </div>

      {/* Last updated */}
      {latestValuation && (
        <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {t('portfolios.lastUpdated')}: {formatDate(latestValuation.valuation_date, language)}
        </p>
      )}
    </button>
  )
}
