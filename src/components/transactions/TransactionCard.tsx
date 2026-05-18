import { Repeat2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Transaction } from '@/types'
import { getCategoryName } from '@/types'
import { formatCurrency } from '@/utils/formatCurrency'
import { txTypeColor, txAmountSign } from '@/utils/calculations'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

interface Props {
  transaction: Transaction
  onClick?: () => void
}

export default function TransactionCard({ transaction: t, onClick }: Props) {
  const { t: i18n } = useTranslation()
  const { language } = useUIStore()
  const { profile } = useAuthStore()
  const currency = profile?.preferred_currency ?? 'PLN'

  const color  = txTypeColor(t.type)
  const sign   = txAmountSign(t.type)
  const amount = sign * t.amount
  const catName = t.category ? getCategoryName(t.category, language) : i18n(`transactions.types.${t.type}`)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 w-full text-left active:opacity-70 transition-opacity"
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        {t.category?.icon ?? '💸'}
      </div>

      {/* Middle */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
          {t.description || catName}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {t.wallet && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {t.wallet.icon} {t.wallet.name}
            </span>
          )}
          {t.person && (
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              · {t.person}
            </span>
          )}
          {t.is_recurring && (
            <Repeat2 className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          )}
        </div>
      </div>

      {/* Amount */}
      <p
        className="text-sm font-bold tabular-nums flex-shrink-0"
        style={{ color: amount >= 0 ? '#10b981' : '#ef4444' }}
      >
        {amount >= 0 ? '+' : ''}{formatCurrency(amount, t.currency, language)}
      </p>
    </button>
  )
}
