import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import TopHeader from '@/components/layout/TopHeader'
import TransactionCard from '@/components/transactions/TransactionCard'
import TransactionFiltersBar from '@/components/transactions/TransactionFilters'
import TransactionSummaryBar from '@/components/transactions/TransactionSummaryBar'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions'
import { formatDateGroup } from '@/utils/formatDate'
import { useUIStore } from '@/store/uiStore'
import type { TransactionFilters } from '@/types'

export default function TransactionsPage() {
  const { t }               = useTranslation()
  const navigate            = useNavigate()
  const { language, isAddTransactionOpen, closeAddTransaction, openAddTransaction, editTransactionId, openEditTransaction, closeEditTransaction } = useUIStore()

  const [filters, setFilters] = useState<TransactionFilters>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: transactions = [], isLoading } = useTransactions(filters)
  const deleteMutation = useDeleteTransaction()

  // Group by date string
  const grouped = transactions.reduce<Record<string, typeof transactions>>((acc, tx) => {
    const key = tx.date
    ;(acc[key] ??= []).push(tx)
    return acc
  }, {})
  const dateKeys = Object.keys(grouped).sort().reverse()

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteMutation.mutateAsync(deleteId)
    setDeleteId(null)
  }

  return (
    <div>
      <TopHeader title={t('transactions.title')} showBack />

      <div className="px-4 pt-4 pb-2 flex flex-col gap-3">
        {/* Filters */}
        <TransactionFiltersBar filters={filters} onChange={setFilters} />

        {/* Summary bar */}
        <TransactionSummaryBar transactions={transactions} />
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <div className="px-4"><SkeletonList count={5} /></div>
      ) : dateKeys.length === 0 ? (
        <EmptyState
          icon="📋"
          title={t('transactions.noTransactions')}
          description={t('transactions.noTransactionsDesc')}
          action={
            <button
              onClick={openAddTransaction}
              className="px-5 h-10 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {t('transactions.addTransaction')}
            </button>
          }
        />
      ) : (
        <div className="pb-4">
          {dateKeys.map(dateKey => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="px-4 py-2 sticky top-[3.5rem] z-10" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDateGroup(dateKey, language)}
                </p>
              </div>

              {/* Transactions for this date */}
              <div className="card mx-4 overflow-hidden divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {grouped[dateKey].map(tx => (
                  <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    onClick={() => openEditTransaction(tx.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal — driven by uiStore FAB state */}
      <TransactionFormModal
        open={isAddTransactionOpen}
        onClose={closeAddTransaction}
      />
      <TransactionFormModal
        open={!!editTransactionId}
        onClose={closeEditTransaction}
        editId={editTransactionId}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title={t('transactions.deleteTransaction')}
        description={t('transactions.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
