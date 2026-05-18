import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Wallet } from '@/types'
import { formatCurrency } from '@/utils/formatCurrency'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

const TYPE_ICONS: Record<string, string> = {
  bank: '🏦', cash: '💵', credit_card: '💳',
  savings: '🐷', investment: '📈', other: '👛',
}

interface Props {
  wallet: Wallet & { current_balance: number }
  onEdit?: () => void
}

export default function WalletCard({ wallet, onEdit }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useUIStore()
  const { profile } = useAuthStore()
  const currency = profile?.preferred_currency ?? 'PLN'

  const isCreditCard = wallet.type === 'credit_card'
  const isNegative   = wallet.current_balance < 0

  // Credit usage
  const used = isCreditCard && wallet.credit_limit
    ? Math.max(0, -wallet.current_balance)
    : 0
  const usagePct = isCreditCard && wallet.credit_limit
    ? Math.min(100, (used / wallet.credit_limit) * 100)
    : 0

  return (
    <div
      className="card p-4 flex items-center gap-3 active:opacity-80 transition-opacity cursor-pointer"
      onClick={() => navigate(`/wallets/${wallet.id}`)}
      role="button"
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: `${wallet.color}22` }}
      >
        <span>{wallet.icon || TYPE_ICONS[wallet.type] || '👛'}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
          {wallet.name}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {t(`wallets.types.${wallet.type}`)} · {wallet.currency}
        </p>

        {/* Credit bar */}
        {isCreditCard && wallet.credit_limit && (
          <div className="mt-1.5">
            <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${usagePct}%`,
                  backgroundColor: usagePct > 80 ? '#ef4444' : usagePct > 60 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {formatCurrency(used, wallet.currency, language)} / {formatCurrency(wallet.credit_limit, wallet.currency, language)}
            </p>
          </div>
        )}
      </div>

      {/* Balance */}
      <div className="text-right flex-shrink-0">
        <p
          className="font-bold text-sm tabular-nums"
          style={{ color: isNegative ? '#ef4444' : 'var(--color-text-primary)' }}
        >
          {formatCurrency(wallet.current_balance, wallet.currency, language)}
        </p>
        {wallet.currency !== currency && (
          <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
            {wallet.currency}
          </p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-muted)' }} />
    </div>
  )
}
