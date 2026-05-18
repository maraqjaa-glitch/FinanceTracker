import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Archive } from 'lucide-react'
import TopHeader from '@/components/layout/TopHeader'
import TransactionCard from '@/components/transactions/TransactionCard'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import WalletFormModal from '@/components/wallets/WalletFormModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useWallets, useArchiveWallet } from '@/hooks/useWallets'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions'
import { useAllTransactions } from '@/hooks/useTransactions'
import { calcWalletBalance } from '@/utils/calculations'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDateGroup } from '@/utils/formatDate'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

export default function WalletDetailPage() {
  const { id }             = useParams<{ id: string }>()
  const { t }              = useTranslation()
  const navigate           = useNavigate()
  const { language }       = useUIStore()
  const { profile }        = useAuthStore()
  const currency           = profile?.preferred_currency ?? 'PLN'

  const [editOpen, setEditOpen]       = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [editTxId, setEditTxId]       = useState<string | null>(null)
  const [addOpen, setAddOpen]         = useState(false)

  const { data: wallets = [] }                         = useWallets()
  const { data: allTransactions = [] }                 = useAllTransactions()
  const { data: walletTxns = [], isLoading }           = useTransactions({ walletIds: id ? [id] : [] })
  const archiveMutation                                = useArchiveWallet()
  const deleteTx                                       = useDeleteTransaction()

  const wallet = wallets.find(w => w.id === id)
  const balance = wallet ? calcWalletBalance(wallet, allTransactions) : 0

  // Group wallet txns by date
  const grouped = walletTxns.reduce<Record<string, typeof walletTxns>>((acc, tx) => {
    ;(acc[tx.date] ??= []).push(tx)
    return acc
  }, {})
  const dateKeys = Object.keys(grouped).sort().reverse()

  const handleArchive = async () => {
    if (!id) return
    await archiveMutation.mutateAsync(id)
    setArchiveOpen(false)
    navigate('/wallets')
  }

  if (!wallet) return null

  return (
    <div>
      <TopHeader
        title={wallet.name}
        showBack
        right={
          <div className="flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              aria-label={t('wallets.editWallet')}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => setArchiveOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              aria-label={t('common.archive')}
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* Balance hero */}
        <div className="card p-6 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3"
            style={{ backgroundColor: `${wallet.color}22` }}
          >
            {wallet.icon}
          </div>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('wallets.balance')}
          </p>
          <p
            className="text-3xl font-bold tabular-nums"
            style={{ color: balance < 0 ? '#ef4444' : 'var(--color-text-primary)' }}
          >
            {formatCurrency(balance, wallet.currency, language)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {t(`wallets.types.${wallet.type}`)} · {wallet.currency}
          </p>
        </div>

        {/* Add transaction shortcut */}
        <button
          onClick={() => setAddOpen(true)}
          className="w-full h-11 rounded-2xl font-semibold text-sm text-white"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          + {t('transactions.addTransaction')}
        </button>

        {/* Transaction history */}
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
            {t('transactions.title')}
          </p>

          {isLoading ? (
            <SkeletonList count={4} />
          ) : dateKeys.length === 0 ? (
            <EmptyState
              icon="📋"
              title={t('transactions.noTransactions')}
              description={t('transactions.noTransactionsDesc')}
            />
          ) : (
            dateKeys.map(dateKey => (
              <div key={dateKey}>
                <div className="py-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    {formatDateGroup(dateKey, language)}
                  </p>
                </div>
                <div className="card overflow-hidden divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {grouped[dateKey].map(tx => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      onClick={() => setEditTxId(tx.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <WalletFormModal open={editOpen} onClose={() => setEditOpen(false)} wallet={wallet} />

      <TransactionFormModal open={addOpen} onClose={() => setAddOpen(false)} />
      <TransactionFormModal open={!!editTxId} onClose={() => setEditTxId(null)} editId={editTxId} />

      <ConfirmDialog
        open={archiveOpen}
        title={`${t('common.archive')} ${wallet.name}?`}
        description="This wallet will be hidden. Transactions are preserved."
        confirmLabel={t('common.archive')}
        loading={archiveMutation.isPending}
        onConfirm={handleArchive}
        onCancel={() => setArchiveOpen(false)}
      />
    </div>
  )
}
