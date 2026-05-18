import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { TransactionFilters, TransactionType } from '@/types'
import { useCategories } from '@/hooks/useCategories'
import { useWallets } from '@/hooks/useWallets'
import { useUIStore } from '@/store/uiStore'
import { getCategoryName } from '@/types'

const ALL_TYPES: TransactionType[] = [
  'income','expense','bill','transfer','savings_deposit','savings_withdrawal','investment',
]

interface Props {
  filters: TransactionFilters
  onChange: (f: TransactionFilters) => void
}

export default function TransactionFiltersBar({ filters, onChange }: Props) {
  const { t }   = useTranslation()
  const { language } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const { data: categories = [] } = useCategories()
  const { data: wallets = [] } = useWallets()

  const hasActive =
    filters.search || filters.types?.length ||
    filters.categoryIds?.length || filters.walletIds?.length || filters.dateRange

  const reset = () => onChange({})

  const toggleType = (type: TransactionType) => {
    const current = filters.types ?? []
    const next = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    onChange({ ...filters, types: next.length ? next : undefined })
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search + filter toggle row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={filters.search ?? ''}
            onChange={e => onChange({ ...filters, search: e.target.value || undefined })}
            placeholder={t('transactions.filters.search')}
            className="w-full h-10 pl-9 pr-3 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded(p => !p)}
          className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 relative"
          style={{
            backgroundColor: hasActive ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            color: hasActive ? '#fff' : 'var(--color-text-secondary)',
          }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hasActive && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
              !
            </span>
          )}
        </button>

        {hasActive && (
          <button
            type="button"
            onClick={reset}
            className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div
          className="rounded-2xl p-4 flex flex-col gap-4"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
        >
          {/* Date range */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('transactions.filters.dateRange')}
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateRange?.from ?? ''}
                onChange={e => onChange({ ...filters, dateRange: { from: e.target.value, to: filters.dateRange?.to ?? '' } })}
                className="flex-1 h-9 px-3 rounded-xl text-xs outline-none"
                style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', colorScheme: 'dark' }}
              />
              <input
                type="date"
                value={filters.dateRange?.to ?? ''}
                onChange={e => onChange({ ...filters, dateRange: { from: filters.dateRange?.from ?? '', to: e.target.value } })}
                className="flex-1 h-9 px-3 rounded-xl text-xs outline-none"
                style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Types */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
              {t('transactions.filters.type')}
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map(type => {
                const active = filters.types?.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className="px-3 h-7 rounded-full text-xs font-medium transition-all"
                    style={{
                      backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-card)',
                      border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      color: active ? '#fff' : 'var(--color-text-secondary)',
                    }}
                  >
                    {t(`transactions.types.${type}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Wallets */}
          {wallets.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>
                {t('transactions.filters.wallet')}
              </p>
              <div className="flex flex-wrap gap-2">
                {wallets.map(w => {
                  const active = filters.walletIds?.includes(w.id)
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        const cur = filters.walletIds ?? []
                        const next = cur.includes(w.id) ? cur.filter(id => id !== w.id) : [...cur, w.id]
                        onChange({ ...filters, walletIds: next.length ? next : undefined })
                      }}
                      className="px-3 h-7 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-card)',
                        border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        color: active ? '#fff' : 'var(--color-text-secondary)',
                      }}
                    >
                      {w.icon} {w.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
