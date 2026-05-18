import { useTranslation } from 'react-i18next'
import type { Transaction } from '@/types'
import { formatCurrency } from '@/utils/formatCurrency'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

interface Props { transactions: Transaction[] }

export default function TransactionSummaryBar({ transactions }: Props) {
  const { t }      = useTranslation()
  const { language } = useUIStore()
  const { profile } = useAuthStore()
  const currency    = profile?.preferred_currency ?? 'PLN'

  const income   = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0)
  const expenses = transactions.filter(tx => ['expense','bill'].includes(tx.type)).reduce((s, tx) => s + tx.amount, 0)
  const balance  = income - expenses

  if (transactions.length === 0) return null

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-2xl"
      style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
    >
      <Stat label={t('dashboard.income')}   value={income}   color="#10b981" currency={currency} language={language} />
      <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border)' }} />
      <Stat label={t('dashboard.expenses')} value={expenses} color="#ef4444" currency={currency} language={language} />
      <div className="w-px h-8" style={{ backgroundColor: 'var(--color-border)' }} />
      <Stat label={t('dashboard.balance')}  value={balance}  color={balance >= 0 ? '#10b981' : '#ef4444'} currency={currency} language={language} />
    </div>
  )
}

function Stat({ label, value, color, currency, language }: { label: string; value: number; color: string; currency: string; language: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{formatCurrency(value, currency, language)}</span>
    </div>
  )
}
