import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TopHeader from '@/components/layout/TopHeader'
import WalletCard from '@/components/wallets/WalletCard'
import WalletFormModal from '@/components/wallets/WalletFormModal'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useWallets } from '@/hooks/useWallets'
import { useAllTransactions } from '@/hooks/useTransactions'
import { calcWalletBalance } from '@/utils/calculations'
import { formatCurrency } from '@/utils/formatCurrency'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import type { Wallet } from '@/types'

export default function WalletsPage() {
  const { t }          = useTranslation()
  const { language }   = useUIStore()
  const { profile }    = useAuthStore()
  const currency       = profile?.preferred_currency ?? 'PLN'
  const [modalOpen, setModalOpen]     = useState(false)
  const [editWallet, setEditWallet]   = useState<Wallet | null>(null)

  const { data: wallets = [], isLoading: wLoading } = useWallets()
  const { data: transactions = [] }                  = useAllTransactions()

  const walletsWithBalance = wallets.map(w => ({
    ...w,
    current_balance: calcWalletBalance(w, transactions),
  }))

  const totalAssets      = walletsWithBalance.filter(w => w.current_balance > 0).reduce((s, w) => s + w.current_balance, 0)
  const totalLiabilities = walletsWithBalance.filter(w => w.current_balance < 0).reduce((s, w) => s + Math.abs(w.current_balance), 0)

  const openCreate = () => { setEditWallet(null); setModalOpen(true) }
  const openEdit   = (w: Wallet) => { setEditWallet(w); setModalOpen(true) }

  return (
    <div>
      <TopHeader
        title={t('wallets.title')}
        showBack
        right={
          <button
            onClick={openCreate}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
            aria-label={t('wallets.addWallet')}
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />

      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Summary card */}
        {walletsWithBalance.length > 0 && (
          <div className="card p-4 flex gap-4">
            <div className="flex-1 text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{t('dashboard.assets')}</p>
              <p className="font-bold tabular-nums text-sm" style={{ color: '#10b981' }}>
                {formatCurrency(totalAssets, currency, language)}
              </p>
            </div>
            <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <div className="flex-1 text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{t('dashboard.liabilities')}</p>
              <p className="font-bold tabular-nums text-sm" style={{ color: '#ef4444' }}>
                {formatCurrency(totalLiabilities, currency, language)}
              </p>
            </div>
            <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <div className="flex-1 text-center">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{t('dashboard.netWorth')}</p>
              <p
                className="font-bold tabular-nums text-sm"
                style={{ color: totalAssets - totalLiabilities >= 0 ? 'var(--color-text-primary)' : '#ef4444' }}
              >
                {formatCurrency(totalAssets - totalLiabilities, currency, language)}
              </p>
            </div>
          </div>
        )}

        {/* Wallet list */}
        {wLoading ? (
          <SkeletonList count={3} />
        ) : walletsWithBalance.length === 0 ? (
          <EmptyState
            icon="👛"
            title={t('wallets.noWallets')}
            description={t('wallets.noWalletsDesc')}
            action={
              <button
                onClick={openCreate}
                className="px-5 h-10 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {t('wallets.addWallet')}
              </button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {walletsWithBalance.map(w => (
              <WalletCard key={w.id} wallet={w} onEdit={() => openEdit(w)} />
            ))}
          </div>
        )}
      </div>

      <WalletFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditWallet(null) }}
        wallet={editWallet}
      />
    </div>
  )
}
