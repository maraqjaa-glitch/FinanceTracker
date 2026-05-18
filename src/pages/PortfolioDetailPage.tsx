import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Archive, Plus, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import TopHeader from '@/components/layout/TopHeader'
import TransactionCard from '@/components/transactions/TransactionCard'
import TransactionFormModal from '@/components/transactions/TransactionFormModal'
import PortfolioFormModal from '@/components/portfolios/PortfolioFormModal'
import ValuationModal from '@/components/portfolios/ValuationModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonCard, SkeletonList } from '@/components/ui/Skeleton'
import {
  usePortfolios, usePortfolioValuations,
  useArchivePortfolio, useDeleteValuation,
} from '@/hooks/usePortfolios'
import { useTransactions, useAllTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate, formatDateGroup } from '@/utils/formatDate'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'

export default function PortfolioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useUIStore()
  const { profile } = useAuthStore()
  const currency = profile?.preferred_currency ?? 'PLN'

  const [editOpen, setEditOpen]         = useState(false)
  const [valuationOpen, setValuationOpen] = useState(false)
  const [addTxOpen, setAddTxOpen]       = useState(false)
  const [editTxId, setEditTxId]         = useState<string | null>(null)
  const [archiveOpen, setArchiveOpen]   = useState(false)
  const [deleteValId, setDeleteValId]   = useState<string | null>(null)

  const { data: portfolios = [] }                   = usePortfolios()
  const { data: valuations = [], isLoading: vLoad } = usePortfolioValuations(id ?? null)
  const { data: allTxns = [] }                      = useAllTransactions()
  const { data: portfolioTxns = [], isLoading: tLoad } = useTransactions(
    id ? { types: ['investment'] } : undefined
  )
  const archiveMut   = useArchivePortfolio()
  const deleteValMut = useDeleteValuation()

  const portfolio = portfolios.find(p => p.id === id)

  // Compute totals
  const total_deposited = allTxns
    .filter(t => t.portfolio_id === id && t.type === 'investment')
    .reduce((s, t) => s + t.amount, 0)

  const filtered_txns = portfolioTxns.filter(t => t.portfolio_id === id)

  const latestValuation = valuations.length > 0
    ? [...valuations].sort((a, b) => b.valuation_date.localeCompare(a.valuation_date))[0]
    : undefined

  const currentValue = latestValuation?.current_value
  const gainLoss     = currentValue !== undefined ? currentValue - total_deposited : undefined
  const returnPct    = total_deposited > 0 && gainLoss !== undefined
    ? (gainLoss / total_deposited) * 100
    : undefined
  const isPositive   = gainLoss !== undefined ? gainLoss >= 0 : undefined
  const gainColor    = isPositive === true ? '#10b981' : isPositive === false ? '#ef4444' : 'var(--color-text-muted)'

  // Chart data — valuations over time + deposited line
  const chartData = valuations.map(v => ({
    date: formatDate(v.valuation_date, language),
    value: v.current_value,
    deposited: total_deposited,
  }))

  // Group transactions by date
  const grouped = filtered_txns.reduce<Record<string, typeof filtered_txns>>((acc, tx) => {
    ;(acc[tx.date] ??= []).push(tx)
    return acc
  }, {})
  const dateKeys = Object.keys(grouped).sort().reverse()

  const handleArchive = async () => {
    if (!id) return
    await archiveMut.mutateAsync(id)
    navigate('/portfolios')
  }

  if (!portfolio) return null

  return (
    <div>
      <TopHeader
        title={portfolio.name}
        showBack
        right={
          <div className="flex gap-2">
            <button onClick={() => setEditOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => setArchiveOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              <Archive className="w-4 h-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4 flex flex-col gap-5">

        {/* ── Value hero card ── */}
        <div className="card p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: `${portfolio.color}22` }}>
              {portfolio.icon}
            </div>
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                {t('portfolios.currentValue')}
              </p>
              <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                {currentValue !== undefined
                  ? formatCurrency(currentValue, portfolio.currency, language)
                  : '—'}
              </p>
              {latestValuation && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  {t('portfolios.lastUpdated')}: {formatDate(latestValuation.valuation_date, language)}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatBox label={t('portfolios.totalDeposited')} value={formatCurrency(total_deposited, portfolio.currency, language)} />
            {gainLoss !== undefined && (
              <>
                <StatBox
                  label={t('portfolios.gainLoss')}
                  value={`${gainLoss >= 0 ? '+' : ''}${formatCurrency(gainLoss, portfolio.currency, language)}`}
                  color={gainColor}
                  icon={isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                />
                <StatBox
                  label={t('portfolios.returnPercent')}
                  value={`${returnPct !== undefined ? `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%` : '—'}`}
                  color={gainColor}
                />
              </>
            )}
          </div>

          {/* Update valuation button */}
          <button
            onClick={() => setValuationOpen(true)}
            className="w-full h-10 rounded-xl font-semibold text-sm text-white mt-4"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {t('portfolios.updateValuation')}
          </button>
        </div>

        {/* ── Valuation history chart ── */}
        {valuations.length >= 2 && (
          <div className="card p-4">
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Valuation history
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'var(--color-text-primary)',
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any) =>
                    typeof val === 'number'
                      ? formatCurrency(val, portfolio.currency, language)
                      : String(val ?? '')
                  }
                />
                <ReferenceLine
                  y={total_deposited}
                  stroke="var(--color-text-muted)"
                  strokeDasharray="4 2"
                  strokeWidth={1}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={portfolio.color}
                  strokeWidth={2}
                  dot={{ fill: portfolio.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] mt-1 text-center" style={{ color: 'var(--color-text-muted)' }}>
              Dashed line = total deposited
            </p>
          </div>
        )}

        {/* ── Valuations list ── */}
        {valuations.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Valuation snapshots
            </p>
            <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {[...valuations].sort((a, b) => b.valuation_date.localeCompare(a.valuation_date)).map(v => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(v.current_value, portfolio.currency, language)}
                    </p>
                    {v.notes && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{v.notes}</p>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {formatDate(v.valuation_date, language)}
                  </p>
                  <button
                    onClick={() => setDeleteValId(v.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg ml-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Add transaction ── */}
        <button
          onClick={() => setAddTxOpen(true)}
          className="w-full h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf630' }}
        >
          <Plus className="w-4 h-4" />
          Add investment transaction
        </button>

        {/* ── Transaction history ── */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
            {t('transactions.title')}
          </p>
          {tLoad ? <SkeletonList count={3} /> : dateKeys.length === 0 ? (
            <EmptyState icon="📋" title={t('transactions.noTransactions')} description={t('transactions.noTransactionsDesc')} />
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
                    <TransactionCard key={tx.id} transaction={tx} onClick={() => setEditTxId(tx.id)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Modals */}
      <PortfolioFormModal open={editOpen} onClose={() => setEditOpen(false)} portfolio={portfolio} />
      <ValuationModal
        open={valuationOpen}
        onClose={() => setValuationOpen(false)}
        portfolioId={portfolio.id}
        portfolioCurrency={portfolio.currency}
      />
      <TransactionFormModal
        open={addTxOpen}
        onClose={() => setAddTxOpen(false)}
        presetType="investment"
        presetPortfolioId={portfolio.id}
      />
      <TransactionFormModal
        open={!!editTxId}
        onClose={() => setEditTxId(null)}
        editId={editTxId}
      />

      <ConfirmDialog
        open={archiveOpen}
        title={`Archive "${portfolio.name}"?`}
        description="Portfolio will be hidden. All transactions and valuations are preserved."
        confirmLabel={t('common.archive')}
        loading={archiveMut.isPending}
        onConfirm={handleArchive}
        onCancel={() => setArchiveOpen(false)}
      />
      <ConfirmDialog
        open={!!deleteValId}
        title="Delete valuation?"
        description="This valuation snapshot will be permanently removed."
        confirmLabel={t('common.delete')}
        destructive
        loading={deleteValMut.isPending}
        onConfirm={async () => {
          if (deleteValId && portfolio.id) {
            await deleteValMut.mutateAsync({ id: deleteValId, portfolioId: portfolio.id })
            setDeleteValId(null)
          }
        }}
        onCancel={() => setDeleteValId(null)}
      />
    </div>
  )
}

function StatBox({
  label, value, color, icon,
}: { label: string; value: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
      <p className="text-[10px] mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <div className="flex items-center gap-1">
        {icon && <span style={{ color }}>{icon}</span>}
        <p className="text-xs font-bold tabular-nums" style={{ color: color ?? 'var(--color-text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  )
}
