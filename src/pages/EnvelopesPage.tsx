import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, Minus } from 'lucide-react'
import TopHeader from '@/components/layout/TopHeader'
import SavingsEnvelopeCard from '@/components/envelopes/SavingsEnvelopeCard'
import BudgetEnvelopeCard from '@/components/envelopes/BudgetEnvelopeCard'
import SavingsEnvelopeFormModal from '@/components/envelopes/SavingsEnvelopeFormModal'
import BudgetEnvelopeFormModal from '@/components/envelopes/BudgetEnvelopeFormModal'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useSavingsEnvelopesWithBalance, useArchiveSavingsEnvelope } from '@/hooks/useSavingsEnvelopes'
import { useBudgetEnvelopesWithSpend, useArchiveBudgetEnvelope } from '@/hooks/useBudgetEnvelopes'
import { useMonthTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/utils/formatCurrency'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import type { SavingsEnvelope, BudgetEnvelope } from '@/types'

type Tab = 'savings' | 'budget'

export default function EnvelopesPage() {
  const { t } = useTranslation()
  const { language } = useUIStore()
  const { profile } = useAuthStore()
  const currency = profile?.preferred_currency ?? 'PLN'
  const now = new Date()

  const [tab, setTab] = useState<Tab>('savings')
  const [savingsModalOpen, setSavingsModalOpen] = useState(false)
  const [budgetModalOpen, setBudgetModalOpen]   = useState(false)
  const [editSavings, setEditSavings] = useState<SavingsEnvelope | null>(null)
  const [editBudget,  setEditBudget]  = useState<BudgetEnvelope  | null>(null)
  const [archiveSavingsId, setArchiveSavingsId] = useState<string | null>(null)
  const [archiveBudgetId,  setArchiveBudgetId]  = useState<string | null>(null)

  // Quick-action deposit/withdraw
  const [depositEnvelopeId, setDepositEnvelopeId] = useState<string | null>(null)
  const [withdrawEnvelopeId, setWithdrawEnvelopeId] = useState<string | null>(null)

  // Data
  const { data: savingsEnvelopes = [], isLoading: sLoading } = useSavingsEnvelopesWithBalance()
  const { data: monthTxns = [] } = useMonthTransactions(now.getFullYear(), now.getMonth() + 1)
  const { data: budgetEnvelopes  = [], isLoading: bLoading } = useBudgetEnvelopesWithSpend(monthTxns)

  const archiveSavings = useArchiveSavingsEnvelope()
  const archiveBudget  = useArchiveBudgetEnvelope()

  // Savings totals
  const totalSaved  = savingsEnvelopes.reduce((s, e) => s + (e.current_balance ?? 0), 0)
  const totalTarget = savingsEnvelopes.reduce((s, e) => s + (e.target_amount ?? 0), 0)

  // Budget totals
  const totalSpent = budgetEnvelopes.reduce((s, e) => s + (e.spent_this_month ?? 0), 0)
  const totalLimit = budgetEnvelopes.reduce((s, e) => s + e.monthly_limit, 0)
  const overBudget = budgetEnvelopes.filter(e => (e.usage_percent ?? 0) >= 100).length

  return (
    <div>
      <TopHeader
        title={t('nav.envelopes')}
        right={
          <button
            onClick={() => tab === 'savings' ? (setEditSavings(null), setSavingsModalOpen(true)) : (setEditBudget(null), setBudgetModalOpen(true))}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus className="w-4 h-4" />
          </button>
        }
      />

      {/* Tab bar */}
      <div className="px-4 pt-2 pb-1">
        <div
          className="flex rounded-2xl p-1"
          style={{ backgroundColor: 'var(--color-bg-elevated)' }}
        >
          {(['savings', 'budget'] as Tab[]).map(tabKey => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setTab(tabKey)}
              className="flex-1 h-9 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: tab === tabKey ? 'var(--color-accent)' : 'transparent',
                color: tab === tabKey ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {tabKey === 'savings' ? t('envelopes.savings') : t('envelopes.budget')}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 flex flex-col gap-3">
        {/* ── SAVINGS TAB ── */}
        {tab === 'savings' && (
          <>
            {/* Summary */}
            {savingsEnvelopes.length > 0 && (
              <div className="card p-4 flex gap-4">
                <div className="flex-1 text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Saved</p>
                  <p className="font-bold tabular-nums text-sm" style={{ color: '#10b981' }}>
                    {formatCurrency(totalSaved, currency, language)}
                  </p>
                </div>
                {totalTarget > 0 && (
                  <>
                    <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
                    <div className="flex-1 text-center">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Target</p>
                      <p className="font-bold tabular-nums text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {formatCurrency(totalTarget, currency, language)}
                      </p>
                    </div>
                    <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
                    <div className="flex-1 text-center">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Progress</p>
                      <p className="font-bold tabular-nums text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* List */}
            {sLoading ? (
              <SkeletonList count={3} />
            ) : savingsEnvelopes.length === 0 ? (
              <EmptyState
                icon="💰"
                title={t('envelopes.noSavings')}
                description="Create a savings goal to start tracking your progress"
                action={
                  <button
                    onClick={() => { setEditSavings(null); setSavingsModalOpen(true) }}
                    className="px-5 h-10 rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {t('envelopes.addSavings')}
                  </button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {savingsEnvelopes.map(env => (
                  <div key={env.id}>
                    <SavingsEnvelopeCard
                      envelope={env}
                      onClick={() => { setEditSavings(env); setSavingsModalOpen(true) }}
                    />
                    {/* Quick action buttons */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setDepositEnvelopeId(env.id)}
                        className="flex-1 h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                        style={{ backgroundColor: '#0ea5e920', color: '#0ea5e9', border: '1px solid #0ea5e930' }}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {t('envelopes.deposit')}
                      </button>
                      <button
                        onClick={() => setWithdrawEnvelopeId(env.id)}
                        className="flex-1 h-8 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
                        style={{ backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef444430' }}
                      >
                        <Minus className="w-3 h-3" />
                        {t('envelopes.withdraw')}
                      </button>
                      <button
                        onClick={() => setArchiveSavingsId(env.id)}
                        className="h-8 px-3 rounded-xl text-xs"
                        style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                      >
                        {t('common.archive')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── BUDGET TAB ── */}
        {tab === 'budget' && (
          <>
            {/* Summary */}
            {budgetEnvelopes.length > 0 && (
              <div className="card p-4 flex gap-4">
                <div className="flex-1 text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Spent</p>
                  <p className="font-bold tabular-nums text-sm" style={{ color: '#f97316' }}>
                    {formatCurrency(totalSpent, currency, language)}
                  </p>
                </div>
                <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
                <div className="flex-1 text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Budget</p>
                  <p className="font-bold tabular-nums text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatCurrency(totalLimit, currency, language)}
                  </p>
                </div>
                {overBudget > 0 && (
                  <>
                    <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
                    <div className="flex-1 text-center">
                      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Over</p>
                      <p className="font-bold text-sm" style={{ color: '#ef4444' }}>
                        {overBudget} 🚨
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* List */}
            {bLoading ? (
              <SkeletonList count={3} />
            ) : budgetEnvelopes.length === 0 ? (
              <EmptyState
                icon="📋"
                title={t('envelopes.noBudget')}
                description="Set spending limits to stay on track each month"
                action={
                  <button
                    onClick={() => { setEditBudget(null); setBudgetModalOpen(true) }}
                    className="px-5 h-10 rounded-xl text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    {t('envelopes.addBudget')}
                  </button>
                }
              />
            ) : (
              <div className="flex flex-col gap-3">
                {budgetEnvelopes.map(env => (
                  <div key={env.id}>
                    <BudgetEnvelopeCard
                      envelope={env}
                      onClick={() => { setEditBudget(env); setBudgetModalOpen(true) }}
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => setArchiveBudgetId(env.id)}
                        className="h-8 px-3 rounded-xl text-xs"
                        style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                      >
                        {t('common.archive')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <SavingsEnvelopeFormModal
        open={savingsModalOpen}
        onClose={() => { setSavingsModalOpen(false); setEditSavings(null) }}
        envelope={editSavings}
      />

      <BudgetEnvelopeFormModal
        open={budgetModalOpen}
        onClose={() => { setBudgetModalOpen(false); setEditBudget(null) }}
        envelope={editBudget}
      />

      {/* Deposit / Withdraw shortcuts — pre-fill transaction form */}
      <TransactionFormModal
        open={!!depositEnvelopeId}
        onClose={() => setDepositEnvelopeId(null)}
        presetType="savings_deposit"
        presetEnvelopeId={depositEnvelopeId}
      />
      <TransactionFormModal
        open={!!withdrawEnvelopeId}
        onClose={() => setWithdrawEnvelopeId(null)}
        presetType="savings_withdrawal"
        presetEnvelopeId={withdrawEnvelopeId}
      />

      {/* Archive confirms */}
      <ConfirmDialog
        open={!!archiveSavingsId}
        title="Archive savings envelope?"
        description="The envelope and its transaction history are preserved."
        confirmLabel={t('common.archive')}
        loading={archiveSavings.isPending}
        onConfirm={async () => { await archiveSavings.mutateAsync(archiveSavingsId!); setArchiveSavingsId(null) }}
        onCancel={() => setArchiveSavingsId(null)}
      />
      <ConfirmDialog
        open={!!archiveBudgetId}
        title="Archive budget envelope?"
        description="The envelope will be hidden. Past data is preserved."
        confirmLabel={t('common.archive')}
        loading={archiveBudget.isPending}
        onConfirm={async () => { await archiveBudget.mutateAsync(archiveBudgetId!); setArchiveBudgetId(null) }}
        onCancel={() => setArchiveBudgetId(null)}
      />
    </div>
  )
}
