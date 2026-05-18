import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis,
} from 'recharts'
import TopHeader from '@/components/layout/TopHeader'
import TransactionCard from '@/components/transactions/TransactionCard'
import { SkeletonCard, SkeletonList } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { useAuthStore } from '@/store/authStore'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import { useMonthTransactions, useAllTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useSavingsEnvelopesWithBalance } from '@/hooks/useSavingsEnvelopes'
import { useBudgetEnvelopesWithSpend } from '@/hooks/useBudgetEnvelopes'
import { usePortfolios, useLatestPortfolioValuations } from '@/hooks/usePortfolios'
import { calcWalletBalance, calcMonthlySummary } from '@/utils/calculations'
import { formatCurrency } from '@/utils/formatCurrency'
import { startOfMonthISO, endOfMonthISO } from '@/utils/formatDate'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ─── Build 6-month net worth sparkline data ──
function useSixMonthNetWorth(
  householdId: string,
  baseNetWorth: number,
  currentMonth: number,
  currentYear: number
) {
  return useQuery({
    queryKey: ['nw_sparkline', householdId, currentYear, currentMonth],
    queryFn: async () => {
      const months: { label: string; value: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - 1 - i, 1)
        const m = d.getMonth() + 1
        const y = d.getFullYear()
        const from = startOfMonthISO(y, m)
        const to   = endOfMonthISO(y, m)

        const { data } = await supabase
          .from('transactions')
          .select('type, amount')
          .eq('household_id', householdId)
          .lte('date', to)

        // Very lightweight: cumulative income − expenses up to end of that month
        const income   = (data ?? []).filter(t => t.type === 'income').reduce((s, t) => s + (t.amount ?? 0), 0)
        const expenses = (data ?? []).filter(t => ['expense','bill'].includes(t.type)).reduce((s, t) => s + (t.amount ?? 0), 0)
        months.push({
          label: new Date(y, m - 1).toLocaleString('default', { month: 'short' }),
          value: income - expenses,
        })
      }
      return months
    },
    enabled: !!householdId,
    staleTime: 1000 * 60 * 15,
  })
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { activeHousehold, members } = useHouseholdStore()
  const { language, dashboardMonth, setDashboardMonth, dashboardMemberFilter, setDashboardMemberFilter } = useUIStore()
  const currency = profile?.preferred_currency ?? 'PLN'
  const hid = activeHousehold?.id ?? ''

  const { month, year } = dashboardMonth

  // ── Month navigation ──────────────────────
  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    setDashboardMonth({ month: d.getMonth() + 1, year: d.getFullYear() })
  }
  const nextMonth = () => {
    const d = new Date(year, month, 1)
    setDashboardMonth({ month: d.getMonth() + 1, year: d.getFullYear() })
  }
  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear()

  // ── Data fetching ─────────────────────────
  const txFilters = dashboardMemberFilter
    ? { dateRange: { from: startOfMonthISO(year, month), to: endOfMonthISO(year, month) }, person: dashboardMemberFilter }
    : undefined

  const { data: monthTxns = [], isLoading: txLoading }   = useMonthTransactions(year, month)
  const { data: allTxns = [] }                            = useAllTransactions()
  const { data: wallets = [], isLoading: wLoading }       = useWallets()
  const { data: savingsEnvelopes = [], isLoading: sLoad } = useSavingsEnvelopesWithBalance()
  const { data: budgetEnvelopes = [] }                    = useBudgetEnvelopesWithSpend(monthTxns)
  const { data: portfolios = [] }                         = usePortfolios()
  const { data: latestValuations = {} }                   = useLatestPortfolioValuations()

  // Filter month transactions by member if selected
  const filteredMonthTxns = dashboardMemberFilter
    ? monthTxns.filter(t => t.person === dashboardMemberFilter)
    : monthTxns

  // ── Calculations ──────────────────────────
  const summary = calcMonthlySummary(filteredMonthTxns, profile?.monthly_income)

  const walletsWithBalance = wallets.map(w => ({
    ...w,
    current_balance: calcWalletBalance(w, allTxns),
  }))

  const totalWalletAssets = walletsWithBalance
    .filter(w => w.include_in_net_worth && w.current_balance > 0)
    .reduce((s, w) => s + w.current_balance, 0)
  const totalLiabilities = walletsWithBalance
    .filter(w => w.include_in_net_worth && w.current_balance < 0)
    .reduce((s, w) => s + Math.abs(w.current_balance), 0)

  const savingsTotal = savingsEnvelopes.reduce((s, e) => s + (e.current_balance ?? 0), 0)

  // Use latest portfolio valuations when available, fall back to deposited amount
  const portfolioTotal = portfolios.reduce((sum, p) => {
    if (latestValuations[p.id] !== undefined) {
      return sum + latestValuations[p.id]
    }
    // fallback: sum deposited
    const deposited = allTxns
      .filter(t => t.portfolio_id === p.id && t.type === 'investment')
      .reduce((s, t) => s + t.amount, 0)
    return sum + deposited
  }, 0)

  const netWorth = totalWalletAssets + savingsTotal + portfolioTotal - totalLiabilities

  // Previous month for delta
  const prevMonthDate = new Date(year, month - 2, 1)
  const prevM = prevMonthDate.getMonth() + 1
  const prevY = prevMonthDate.getFullYear()
  const { data: prevMonthTxns = [] } = useMonthTransactions(prevY, prevM)
  const prevSummary = calcMonthlySummary(prevMonthTxns, profile?.monthly_income)
  const balanceDelta = summary.balance - prevSummary.balance
  const deltaPositive = balanceDelta >= 0

  // Budget alerts
  const budgetAlerts = budgetEnvelopes.filter(e => (e.usage_percent ?? 0) >= 70)

  // Sparkline data (last 6 months of balance)
  const { data: sparklineData = [] } = useSixMonthNetWorth(hid, netWorth, month, year)

  // Month label
  const monthLabel = new Date(year, month - 1).toLocaleString(
    language === 'pl' ? 'pl-PL' : 'en-US',
    { month: 'long', year: 'numeric' }
  )

  const isLoading = txLoading || wLoading || sLoad

  return (
    <div>
      <TopHeader title={activeHousehold?.name ?? t('dashboard.title')} showSettings />

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* ── Month Navigator ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <p className="font-semibold text-sm capitalize" style={{ color: 'var(--color-text-primary)' }}>
            {monthLabel}
          </p>

          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl disabled:opacity-30"
            style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Member filter chips ── */}
        {members.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            <button
              onClick={() => setDashboardMemberFilter(null)}
              className="flex-shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: !dashboardMemberFilter ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                color: !dashboardMemberFilter ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${!dashboardMemberFilter ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {t('common.all')}
            </button>
            {members.map(m => {
              const name = m.profile?.full_name ?? m.profile?.email ?? m.user_id.slice(0, 6)
              const isActive = dashboardMemberFilter === name
              const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <button
                  key={m.user_id}
                  onClick={() => setDashboardMemberFilter(isActive ? null : name)}
                  className="flex-shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    color: isActive ? '#fff' : 'var(--color-text-secondary)',
                    border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {m.profile?.avatar_url ? (
                    <img src={m.profile.avatar_url} className="w-4 h-4 rounded-full object-cover" alt="" />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'var(--color-accent)', color: '#fff' }}
                    >
                      {initials}
                    </div>
                  )}
                  {name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Monthly Overview Card ── */}
        {txLoading ? <SkeletonCard lines={4} /> : (
          <div className="card p-5">
            <p className="text-xs font-semibold mb-4" style={{ color: 'var(--color-text-muted)' }}>
              {t('dashboard.monthlyOverview')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <StatItem label={t('dashboard.income')}   value={summary.income}   color="#10b981" currency={currency} language={language} />
              <StatItem label={t('dashboard.bills')}    value={summary.bills}    color="#f97316" currency={currency} language={language} />
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

            {/* Delta vs last month */}
            {!txLoading && prevMonthTxns.length > 0 && (
              <div
                className="mt-4 pt-3 border-t flex items-center gap-2"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {deltaPositive
                  ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                  : <TrendingDown className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />}
                <p className="text-xs" style={{ color: deltaPositive ? '#10b981' : '#ef4444' }}>
                  {deltaPositive ? '+' : ''}{formatCurrency(balanceDelta, currency, language)} vs last month
                </p>
              </div>
            )}

            {/* Savings rate */}
            {profile?.monthly_income && profile.monthly_income > 0 && (
              <div
                className="mt-3 pt-3 border-t flex items-center justify-between"
                style={{ borderColor: 'var(--color-border)' }}
              >
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

        {/* ── Net Worth Card with sparkline ── */}
        {wLoading || sLoad ? <SkeletonCard lines={3} /> : (
          <div className="card p-5">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
              {t('dashboard.netWorth')}
            </p>
            <p
              className="text-3xl font-bold tabular-nums mb-3"
              style={{ color: netWorth >= 0 ? 'var(--color-text-primary)' : '#ef4444' }}
            >
              {formatCurrency(netWorth, currency, language)}
            </p>

            {/* Sparkline */}
            {sparklineData.length >= 2 && (
              <div className="h-14 -mx-1 mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                    <defs>
                      <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '10px',
                        color: 'var(--color-text-primary)',
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(val: any) =>
                        typeof val === 'number'
                          ? formatCurrency(val, currency, language)
                          : String(val ?? '')
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      fill="url(#sparkGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Assets / Liabilities breakdown */}
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('dashboard.assets')}
                </p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: '#10b981' }}>
                  {formatCurrency(totalWalletAssets + savingsTotal + portfolioTotal, currency, language)}
                </p>
                {portfolioTotal > 0 && (
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    incl. {formatCurrency(portfolioTotal, currency, language)} investments
                  </p>
                )}
              </div>
              <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="flex-1">
                <p className="text-[10px] mb-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {t('dashboard.liabilities')}
                </p>
                <p className="text-sm font-semibold tabular-nums" style={{ color: '#ef4444' }}>
                  {formatCurrency(totalLiabilities, currency, language)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Wallet Balances ── */}
        {wLoading ? <SkeletonList count={2} /> : walletsWithBalance.length === 0 ? (
          <EmptyState
            icon="👛"
            title={t('wallets.noWallets')}
            description={t('wallets.noWalletsDesc')}
            action={
              <button
                onClick={() => navigate('/wallets')}
                className="px-4 h-9 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {t('wallets.addWallet')}
              </button>
            }
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.wallets')}
              </p>
              <button
                onClick={() => navigate('/wallets')}
                className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
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
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: `${w.color}22` }}
                  >
                    {w.icon}
                  </div>
                  <p className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {w.name}
                  </p>
                  <p
                    className="text-sm font-bold tabular-nums flex-shrink-0"
                    style={{ color: w.current_balance < 0 ? '#ef4444' : 'var(--color-text-primary)' }}
                  >
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
              <button
                onClick={() => navigate('/envelopes')}
                className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
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
                      <>
                        <div
                          className="mt-1 h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--color-border)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, env.progress_percent ?? 0)}%`,
                              backgroundColor: (env.progress_percent ?? 0) >= 100 ? '#10b981' : '#0ea5e9',
                            }}
                          />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {Math.round(env.progress_percent ?? 0)}% of {formatCurrency(env.target_amount, env.currency, language)}
                        </p>
                      </>
                    )}
                  </div>
                  <p
                    className="text-sm font-bold tabular-nums flex-shrink-0"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
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
              <button
                onClick={() => navigate('/envelopes')}
                className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
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
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {env.name}
                        </p>
                        {isOver && (
                          <span className="text-[10px] font-bold ml-2 flex-shrink-0" style={{ color: '#ef4444' }}>
                            OVER
                          </span>
                        )}
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ backgroundColor: 'var(--color-border)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, env.usage_percent ?? 0)}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                    <p
                      className="text-xs font-bold tabular-nums flex-shrink-0 ml-3"
                      style={{ color: barColor }}
                    >
                      {Math.round(env.usage_percent ?? 0)}%
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Recent Transactions ── */}
        {txLoading ? (
          <SkeletonList count={3} />
        ) : filteredMonthTxns.length === 0 ? (
          <EmptyState
            icon="📋"
            title={t('transactions.noTransactions')}
            description={t('transactions.noTransactionsDesc')}
            action={
              <button
                onClick={() => useUIStore.getState().openAddTransaction()}
                className="px-4 h-9 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {t('transactions.addTransaction')}
              </button>
            }
          />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                {t('dashboard.recentTransactions')}
              </p>
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs font-medium"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('common.seeAll')}
              </button>
            </div>
            <div
              className="card divide-y overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {filteredMonthTxns.slice(0, 5).map(tx => (
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

// ── Stat item helper ──────────────────────────
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
