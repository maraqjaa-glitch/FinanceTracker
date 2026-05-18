import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TopHeader from '@/components/layout/TopHeader'
import TransactionCard from '@/components/transactions/TransactionCard'
import { SkeletonCard, SkeletonList } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import { useMonthTransactions, useAllTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useSavingsEnvelopesWithBalance } from '@/hooks/useSavingsEnvelopes'
import { useBudgetEnvelopesWithSpend } from '@/hooks/useBudgetEnvelopes'
import { usePortfolios, usePortfolioValuations } from '@/hooks/usePortfolios'
import { calcWalletBalance, calcMonthlySummary } from '@/utils/calculations'
import { formatCurrency } from '@/utils/formatCurrency'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { activeHousehold } = useHouseholdStore()
  const { language, dashboardMonth, setDashboardMonth } = useUIStore()
  const currency = profile?.preferred_currency ?? 'PLN'

  const { month, year } = dashboardMonth

  // Navigate months
  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    setDashboardMonth({ month: d.getMonth() + 1, year: d.getFullYear() })
  }
  const nextMonth = () => {
    const d = new Date(year, month, 1)
    setDashboardMonth({ month: d.getMonth() + 1, year: d.getFullYear() })
  }
  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear()

  // Data
  const { data: monthTxns = [], isLoading: txLoading } = useMonthTransactions(year, month)
  const { data: allTxns = [] }  = useAllTransactions()
  const { data: wallets = [], isLoading: wLoading } = useWallets()
  const { data: savingsEnvelopes = [], isLoading: sLoading } = useSavingsEnvelopesWithBalance()
  const { data: budgetEnvelopes = [] } = useBudgetEnvelopesWithSpend(monthTxns)
  const { data: portfolios = [] } = usePortfolios()

  // Get latest valuation for each portfolio from all transactions
  // (lightweight: sum investment txns per portfolio for total deposited)
  const portfolioValue = portfolios.reduce((sum, p) => {
    // We can't call hooks inside reduce, so we approximate from allTxns
    // Full valuation-based value shown on portfolio detail page
    const deposited = allTxns
      .filter(t => t.portfolio_id === p.id && t.type === 'investment')
      .reduce((s, t) => s + t.amount, 0)
    return sum + deposited
  }, 0)

  // Monthly summary
  const summary = calcMonthlySummary(monthTxns, profile?.monthly_income)

  // Wallet balances
  const walletsWithBalance = wallets.map(w => ({
    ...w,
    current_balance: calcWalletBalance(w, allTxns),
  }))
  const totalAssets = walletsWithBalance
    .filter(w => w.include_in_net_worth && w.current_balance > 0)
    .reduce((s, w) => s + w.current_balance, 0)
  const totalLiabilities = walletsWithBalance
    .filter(w => w.include_in_net_worth && w.current_balance < 0)
    .reduce((s, w) => s + Math.abs(w.current_balance), 0)
  const savingsTotal = savingsEnvelopes.reduce((s, e) => s + (e.current_balance ?? 0), 0)
  const netWorth = totalAssets + savingsTotal + portfolioValue - totalLiabilities

  // Budget alerts: envelopes ≥ 70% used
  const budgetAlerts = budgetEnvelopes.filter(e => (e.usage_percent ?? 0) >= 70)

  // Month label
  const monthLabel = new Date(year, month - 1).toLocaleString(
    language === 'pl' ? 'pl-PL' : 'en-US',
    { month: 'long', year: 'numeric' }
  )

  return (
    <div>
      <TopHeader title={activeHousehold?.name ?? t('dashboard.title')} showSettings />

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* ── Month Navigator ── */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>

          <p className="font-semibold text-sm capitalize" style={{ color: 'var(--color-text-primary)' }}>
            {monthLabel}
          </p>

          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl disabled:opacity-30"
            style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Monthly Overview Card ── */}
        {txLoading ? <SkeletonCard lines={4} /> : (
          <div className="card p-5">
            <p className="text-xs font-semibold mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {t('dashboard.monthlyOverview')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <StatItem label={t('dashboard.income')}  value={summary.income}   color="#10b981" currency={currency} language={language} />
              <StatItem label={t('dashboard.bills')}   value={summary.bills}    color="#f97316" currency={currency} language={language} />
              <StatItem label={t('dashboard.expenses')} value={summary.expenses} color="#ef4444" currency={currency} language={language} />
              <StatItem
                label={t('dashboard.balance')}
                value={summary.balance}
                color={summary.balance >= 0 ? '#10b981' : '#ef4444'}
                currency={currency}
                language={language}
                large
              />
            </div>
            {profile?.monthly_income && profile.monthly_income > 0 && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {t('dashboard.savingsRate')}
                </p>
                <p className="text-sm font-bold tabular-nums"
                  style={{ color: summary.savingsRate >= 0 ? '#10b981' : '#ef4444' }}>
                  {summary.savingsRate}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Net Worth Card ── */}
        {wLoading || sLoading ? <SkeletonCard lines={3} /> : (
          <div className="card p-5">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('dashboard.netWorth')}
            </p>
            <p className="text-3xl font-bold tabular-nums mb-3"
              style={{ color: netWorth >= 0 ? 'var(--color-text-primary)' : '#ef4444' }}>
              {formatCurrency(netWorth, currency, language)}
            </p>
            <div className="flex gap-4">
              <div>
                <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('dashboard.assets')}</p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: '#10b981' }}>
                  {formatCurrency(totalAssets + savingsTotal + portfolioValue, currency, language)}
                </p>
              </div>
              <div>
                <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>{t('dashboard.liabilities')}</p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: '#ef4444' }}>
                  {formatCurrency(totalLiabilities, currency, language)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Wallet Balances ── */}
        {wLoading ? <SkeletonList count={2} /> : walletsWithBalance.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.wallets')}
              </p>
              <button onClick={() => navigate('/wallets')} className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}>
                {t('common.seeAll')}
              </button>
            </div>
            <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {walletsWithBalance.slice(0, 4).map(w => (
                <button
                  key={w.id}
                  onClick={() => navigate(`/wallets/${w.id}`)}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: `${w.color}22` }}>
                    {w.icon}
                  </div>
                  <p className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {w.name}
                  </p>
                  <p className="text-sm font-bold tabular-nums flex-shrink-0"
                    style={{ color: w.current_balance < 0 ? '#ef4444' : 'var(--color-text-primary)' }}>
                    {formatCurrency(w.current_balance, w.currency, language)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Savings Envelopes Preview ── */}
        {savingsEnvelopes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.savingsEnvelopes')}
              </p>
              <button onClick={() => navigate('/envelopes')} className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}>
                {t('common.seeAll')}
              </button>
            </div>
            <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {savingsEnvelopes.slice(0, 3).map(env => (
                <button
                  key={env.id}
                  onClick={() => navigate('/envelopes')}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left"
                >
                  <span className="text-xl">{env.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {env.name}
                    </p>
                    {env.target_amount && (
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (env.progress_percent ?? 0))}%`,
                            backgroundColor: (env.progress_percent ?? 0) >= 100 ? '#10b981' : '#0ea5e9',
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                    {formatCurrency(env.current_balance ?? 0, env.currency, language)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Budget Alerts ── */}
        {budgetAlerts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.budgetAlerts')}
              </p>
              <button onClick={() => navigate('/envelopes')} className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}>
                {t('common.seeAll')}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {budgetAlerts.slice(0, 3).map(env => {
                const isOver = (env.usage_percent ?? 0) >= 100
                const barColor = isOver ? '#ef4444' : '#f59e0b'
                return (
                  <button
                    key={env.id}
                    onClick={() => navigate('/envelopes')}
                    className="card p-3 flex items-center gap-3 w-full text-left"
                  >
                    <span className="text-lg">{env.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {env.name}
                      </p>
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, env.usage_percent ?? 0)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs font-bold tabular-nums flex-shrink-0"
                      style={{ color: barColor }}>
                      {Math.round(env.usage_percent ?? 0)}%
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Recent Transactions ── */}
        {txLoading ? <SkeletonList count={3} /> : monthTxns.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.recentTransactions')}
              </p>
              <button onClick={() => navigate('/transactions')} className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}>
                {t('common.seeAll')}
              </button>
            </div>
            <div className="card divide-y overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              {monthTxns.slice(0, 5).map(tx => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onClick={() => useUIStore.getState().openEditTransaction(tx.id)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Small helper component ────────────────────
function StatItem({
  label, value, color, currency, language, large = false,
}: {
  label: string
  value: number
  color: string
  currency: string
  language: string
  large?: boolean
}) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      <p
        className={`font-bold tabular-nums ${large ? 'text-xl' : 'text-sm'}`}
        style={{ color }}
      >
        {formatCurrency(value, currency, language)}
      </p>
    </div>
  )
}
