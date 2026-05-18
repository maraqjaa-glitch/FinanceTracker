import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from 'recharts'
import TopHeader from '@/components/layout/TopHeader'
import { SkeletonCard } from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { useAllTransactions } from '@/hooks/useTransactions'
import { useWallets } from '@/hooks/useWallets'
import { useSavingsEnvelopesWithBalance } from '@/hooks/useSavingsEnvelopes'
import { useLatestPortfolioValuations, usePortfolios } from '@/hooks/usePortfolios'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import {
  buildMonthlyAgg, lastNMonths, aggregateByCategory,
  buildYoYComparison, buildNetWorthTimeline, calcWalletBalance,
} from '@/utils/calculations'
import { formatCurrency, formatNumber } from '@/utils/formatCurrency'
import { startOfMonthISO, endOfMonthISO } from '@/utils/formatDate'
import type { Transaction } from '@/types'

// ─── Types ───────────────────────────────────
type Tab = 'overview' | 'income' | 'expenses' | 'trends' | 'networth'
type Period = '3m' | '6m' | '12m' | 'ytd' | 'custom'

// ─── Shared tooltip style ─────────────────────
const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '11px',
    color: 'var(--color-text-primary)',
  },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
}

/** Type-safe Recharts tooltip formatter — handles ValueType | undefined */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RcFormatter = (value: any, name: any) => [string, string]

function currencyFmt(currency: string, language: string): RcFormatter {
  return (v, name) => [
    typeof v === 'number' ? formatCurrency(v, currency, language) : String(v ?? ''),
    String(name ?? ''),
  ]
}
function percentFmt(): RcFormatter {
  return (v) => [typeof v === 'number' ? `${v}%` : String(v ?? ''), 'Rate']
}

// ─── Period → date range ──────────────────────
function periodToRange(period: Period, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  if (period === 'custom' && customFrom && customTo) return { from: customFrom, to: customTo }
  if (period === 'ytd') return { from: `${now.getFullYear()}-01-01`, to: today }
  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12
  const d = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  return { from: startOfMonthISO(d.getFullYear(), d.getMonth() + 1), to: today }
}

// ─── Filter helper ────────────────────────────
function filterByRange(txns: Transaction[], from: string, to: string): Transaction[] {
  return txns.filter(t => t.date >= from && t.date <= to)
}

// ─── Donut chart label ────────────────────────
function DonutLabel({ cx, cy, value, currency, language }: {
  cx: number; cy: number; value: number; currency: string; language: string
}) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.3em" fill="var(--color-text-primary)" fontSize={12} fontWeight={700}>
        {formatCurrency(value, currency, language)}
      </tspan>
    </text>
  )
}



// ─── Main Component ───────────────────────────
export default function AnalyticsPage() {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const { language } = useUIStore()
  const currency = profile?.preferred_currency ?? 'PLN'

  // ── State ──────────────────────────────────
  const [tab, setTab] = useState<Tab>('overview')
  const [period, setPeriod] = useState<Period>('6m')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')

  // ── Data ───────────────────────────────────
  const { data: allTxns = [], isLoading } = useAllTransactions()
  const { data: wallets = [] } = useWallets()
  const { data: savingsEnvelopes = [] } = useSavingsEnvelopesWithBalance()
  const { data: portfolios = [] } = usePortfolios()
  const { data: latestValuations = {} } = useLatestPortfolioValuations()

  // ── Derived ────────────────────────────────
  const { from, to } = periodToRange(period, customFrom, customTo)
  const periodTxns = useMemo(() => filterByRange(allTxns, from, to), [allTxns, from, to])

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview',  label: t('analytics.overview') },
    { id: 'income',    label: t('analytics.income') },
    { id: 'expenses',  label: t('analytics.expenses') },
    { id: 'trends',    label: t('analytics.trends') },
    { id: 'networth',  label: t('analytics.netWorth') },
  ]

  const PERIODS: { id: Period; label: string }[] = [
    { id: '3m',  label: '3M' },
    { id: '6m',  label: '6M' },
    { id: '12m', label: '12M' },
    { id: 'ytd', label: 'YTD' },
    { id: 'custom', label: '…' },
  ]

  return (
    <div>
      <TopHeader title={t('analytics.title')} />

      {/* ── Tab bar ── */}
      <div className="px-4 pt-3 pb-1 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(tb => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className="px-3 h-8 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                backgroundColor: tab === tb.id ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                color: tab === tb.id ? '#fff' : 'var(--color-text-muted)',
                border: `1px solid ${tab === tb.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Period filter ── */}
      <div className="px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className="h-6 px-2 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                backgroundColor: period === p.id ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                color: period === p.id ? '#fff' : 'var(--color-text-muted)',
                border: `1px solid ${period === p.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="input h-6 text-[10px] px-2 flex-1"
              style={{ colorScheme: 'dark' }}
            />
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>–</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="input h-6 text-[10px] px-2 flex-1"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        )}
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 pb-6">
        {isLoading && <SkeletonCard lines={4} />}

        {!isLoading && tab === 'overview' && (
          <OverviewTab txns={periodTxns} allTxns={allTxns} currency={currency} language={language} t={t} />
        )}
        {!isLoading && tab === 'income' && (
          <IncomeTab txns={periodTxns} allTxns={allTxns} currency={currency} language={language} t={t} />
        )}
        {!isLoading && tab === 'expenses' && (
          <ExpensesTab txns={periodTxns} allTxns={allTxns} currency={currency} language={language} t={t} />
        )}
        {!isLoading && tab === 'trends' && (
          <TrendsTab txns={periodTxns} currency={currency} language={language} t={t} />
        )}
        {!isLoading && tab === 'networth' && (
          <NetWorthTab
            allTxns={allTxns}
            wallets={wallets}
            savingsEnvelopes={savingsEnvelopes}
            portfolios={portfolios}
            latestValuations={latestValuations}
            currency={currency}
            language={language}
            t={t}
          />
        )}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────
function OverviewTab({ txns, allTxns, currency, language, t }: {
  txns: Transaction[]; allTxns: Transaction[];
  currency: string; language: string; t: (k: string) => string
}) {
  const months = lastNMonths(6)
  const agg = useMemo(() => buildMonthlyAgg(allTxns), [allTxns])

  const barData = months.map(key => {
    const m = agg[key]
    return {
      label: m?.label ?? key.slice(5),
      income:   m?.income   ?? 0,
      expenses: m?.expenses ?? 0,
      bills:    m?.bills    ?? 0,
    }
  })

  // Category donut for expenses+bills in period
  const catData = useMemo(
    () => aggregateByCategory(txns, ['expense', 'bill'], language as 'pl' | 'en'),
    [txns, language]
  )
  const top5 = catData.slice(0, 5)
  const totalExpenses = catData.reduce((s, c) => s + c.total, 0)

  // Savings rate trend line
  const savingsData = months.map(key => ({
    label: agg[key]?.label ?? key.slice(5),
    rate: agg[key]?.savingsRate ?? 0,
  }))

  if (txns.length === 0) {
    return <EmptyState icon="📊" title="No data for this period" description="Add transactions to see analytics." />
  }

  return (
    <div className="flex flex-col gap-5 pt-2">

      {/* Income vs Expenses bar chart */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Income vs Expenses — last 6 months
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => formatNumber(v, language).split(',')[0].split(' ')[0]} />
            <Tooltip {...tooltipStyle}
              formatter={currencyFmt(currency, language)} />
            <Bar dataKey="income"   fill="#10b981" radius={[3,3,0,0]} maxBarSize={24} name="Income" />
            <Bar dataKey="expenses" fill="#ef4444" radius={[3,3,0,0]} maxBarSize={24} name="Expenses" />
            <Bar dataKey="bills"    fill="#f97316" radius={[3,3,0,0]} maxBarSize={24} name="Bills" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category donut */}
      {top5.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
            {t('analytics.topCategories')} — expenses
          </p>
          <div className="flex gap-4 items-center">
            <div className="flex-shrink-0">
              <PieChart width={120} height={120}>
                <Pie
                  data={top5}
                  dataKey="total"
                  cx={55} cy={55}
                  innerRadius={30} outerRadius={52}
                  paddingAngle={2}
                  startAngle={90} endAngle={450}
                >
                  {top5.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {top5.map(cat => (
                <div key={cat.categoryId} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-[10px] flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    {cat.icon} {cat.categoryName}
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Savings rate line */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {t('analytics.savingsRate')} %
        </p>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={savingsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
            <Tooltip {...tooltipStyle} formatter={percentFmt()} />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Line type="monotone" dataKey="rate" stroke="var(--color-accent)" strokeWidth={2}
              dot={{ fill: 'var(--color-accent)', r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top 5 ranked */}
      {top5.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Top categories
          </p>
          <div className="flex flex-col gap-2">
            {top5.map((cat, i) => (
              <div key={cat.categoryId}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold w-4" style={{ color: 'var(--color-text-muted)' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {cat.categoryName}
                  </span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatCurrency(cat.total, currency, language)}
                  </span>
                </div>
                <div className="ml-6 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────
// INCOME TAB
// ─────────────────────────────────────────────
function IncomeTab({ txns, allTxns, currency, language, t }: {
  txns: Transaction[]; allTxns: Transaction[];
  currency: string; language: string; t: (k: string) => string
}) {
  const now = new Date()
  const months = lastNMonths(6)
  const agg = useMemo(() => buildMonthlyAgg(allTxns), [allTxns])

  const barData = months.map(key => ({
    label: agg[key]?.label ?? key.slice(5),
    income: agg[key]?.income ?? 0,
  }))

  const totalIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const catData = useMemo(
    () => aggregateByCategory(txns, ['income'], language as 'pl' | 'en'),
    [txns, language]
  )

  const yoyData = useMemo(
    () => buildYoYComparison(allTxns, ['income'], now.getFullYear()),
    [allTxns]
  )
  const yoyMax = Math.max(...yoyData.map(r => Math.max(r.current, r.previous)), 1)

  if (txns.filter(t => t.type === 'income').length === 0) {
    return <EmptyState icon="💚" title="No income in this period" />
  }

  return (
    <div className="flex flex-col gap-5 pt-2">

      {/* Summary */}
      <div className="card p-4">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total income — period</p>
        <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: '#10b981' }}>
          {formatCurrency(totalIncome, currency, language)}
        </p>
      </div>

      {/* Monthly bar */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Monthly income — last 6 months
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => formatNumber(v, language).split(',')[0].split(' ')[0]} />
            <Tooltip {...tooltipStyle}
              formatter={currencyFmt(currency, language)} />
            <Bar dataKey="income" fill="#10b981" radius={[4,4,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {catData.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Income by category
          </p>
          <div className="flex flex-col gap-2">
            {catData.slice(0, 6).map(cat => (
              <div key={cat.categoryId}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {cat.categoryName}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatCurrency(cat.total, currency, language)}
                  </span>
                  <span className="text-[10px] w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
                    {cat.percentage}%
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: '#10b981' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YoY comparison */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {t('analytics.yoyComparison')} — income
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={yoyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => formatNumber(v, language).split(',')[0].split(' ')[0]} />
            <Tooltip {...tooltipStyle}
              formatter={currencyFmt(currency, language)} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)' }} />
            <Bar dataKey="current"  name={`${now.getFullYear()}`}       fill="#10b981" radius={[3,3,0,0]} maxBarSize={16} />
            <Bar dataKey="previous" name={`${now.getFullYear() - 1}`}   fill="#10b981" fillOpacity={0.35} radius={[3,3,0,0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────
// EXPENSES TAB
// ─────────────────────────────────────────────
function ExpensesTab({ txns, allTxns, currency, language, t }: {
  txns: Transaction[]; allTxns: Transaction[];
  currency: string; language: string; t: (k: string) => string
}) {
  const now = new Date()
  const months = lastNMonths(6)
  const agg = useMemo(() => buildMonthlyAgg(allTxns), [allTxns])

  const barData = months.map(key => ({
    label: agg[key]?.label ?? key.slice(5),
    expenses: agg[key]?.expenses ?? 0,
    bills:    agg[key]?.bills    ?? 0,
  }))

  const totalOut = txns
    .filter(t => t.type === 'expense' || t.type === 'bill')
    .reduce((s, t) => s + t.amount, 0)

  const catData = useMemo(
    () => aggregateByCategory(txns, ['expense', 'bill'], language as 'pl' | 'en'),
    [txns, language]
  )

  const yoyData = useMemo(
    () => buildYoYComparison(allTxns, ['expense', 'bill'], now.getFullYear()),
    [allTxns]
  )

  const expenseTxns = txns.filter(t => t.type === 'expense' || t.type === 'bill')
  if (expenseTxns.length === 0) {
    return <EmptyState icon="🔴" title="No expenses in this period" />
  }

  return (
    <div className="flex flex-col gap-5 pt-2">

      {/* Summary */}
      <div className="card p-4 flex gap-4">
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total spending</p>
          <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: '#ef4444' }}>
            {formatCurrency(totalOut, currency, language)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Transactions</p>
          <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
            {expenseTxns.length}
          </p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Expenses + Bills — last 6 months
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => formatNumber(v, language).split(',')[0].split(' ')[0]} />
            <Tooltip {...tooltipStyle}
              formatter={currencyFmt(currency, language)} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)' }} />
            <Bar dataKey="expenses" name="Expenses" stackId="a" fill="#ef4444" maxBarSize={32} />
            <Bar dataKey="bills"    name="Bills"    stackId="a" fill="#f97316" radius={[4,4,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {catData.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Spending by category
          </p>
          <div className="flex flex-col gap-2">
            {catData.slice(0, 8).map(cat => (
              <div key={cat.categoryId}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {cat.categoryName}
                  </span>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatCurrency(cat.total, currency, language)}
                  </span>
                  <span className="text-[10px] w-8 text-right" style={{ color: 'var(--color-text-muted)' }}>
                    {cat.percentage}%
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YoY */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {t('analytics.yoyComparison')} — expenses
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={yoyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => formatNumber(v, language).split(',')[0].split(' ')[0]} />
            <Tooltip {...tooltipStyle}
              formatter={currencyFmt(currency, language)} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)' }} />
            <Bar dataKey="current"  name={`${now.getFullYear()}`}       fill="#ef4444" radius={[3,3,0,0]} maxBarSize={16} />
            <Bar dataKey="previous" name={`${now.getFullYear() - 1}`}   fill="#ef4444" fillOpacity={0.35} radius={[3,3,0,0]} maxBarSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────
// TRENDS TAB
// ─────────────────────────────────────────────
function TrendsTab({ txns, currency, language, t }: {
  txns: Transaction[]; currency: string; language: string; t: (k: string) => string
}) {
  const months = lastNMonths(12)
  // Re-compute agg only from the passed txns (already period-filtered upstream)
  // But for Trends we always want the last 12 months regardless of period selector
  // So we re-use allTxns via the passed txns (parent already set period to ≥12m for meaningful trends)
  const agg = useMemo(() => buildMonthlyAgg(txns), [txns])

  const chartData = months.map(key => {
    const m = agg[key]
    return {
      label:       m?.label       ?? key.slice(5),
      income:      m?.income      ?? 0,
      expenses:    m?.expenses    ?? 0,
      bills:       m?.bills       ?? 0,
      balance:     m?.balance     ?? 0,
      savingsRate: m?.savingsRate ?? 0,
    }
  })

  if (txns.length === 0) {
    return <EmptyState icon="📈" title="No data for this period" />
  }

  return (
    <div className="flex flex-col gap-5 pt-2">

      {/* Multi-line: income / expenses / balance */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          12-month rolling view
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => formatNumber(Math.abs(v), language).split(',')[0].split(' ')[0]} />
            <Tooltip {...tooltipStyle}
              formatter={currencyFmt(currency, language)} />
            <Legend wrapperStyle={{ fontSize: 10, color: 'var(--color-text-muted)' }} />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Line type="monotone" dataKey="income"   stroke="#10b981" strokeWidth={2} dot={false} name="Income" />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
            <Line type="monotone" dataKey="bills"    stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Bills" />
            <Line type="monotone" dataKey="balance"  stroke="var(--color-accent)" strokeWidth={2.5} dot={false} name="Balance" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Savings rate area */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {t('analytics.savingsRate')} %
        </p>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="srGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
              tickFormatter={v => `${v}%`} />
            <Tooltip {...tooltipStyle} formatter={percentFmt()} />
            <ReferenceLine y={0} stroke="var(--color-border)" />
            <Area type="monotone" dataKey="savingsRate" stroke="var(--color-accent)" strokeWidth={2}
              fill="url(#srGrad)" dot={false} name="Savings rate" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly summary table */}
      <div className="card overflow-hidden">
        <p className="text-xs font-semibold px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>
          Monthly summary table
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
                {['Month','Income','Expenses','Bills','Balance','Rate'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold"
                    style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="px-3 py-2 font-medium" style={{ color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                    {row.label}
                  </td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#10b981' }}>
                    {formatCurrency(row.income, currency, language)}
                  </td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#ef4444' }}>
                    {formatCurrency(row.expenses, currency, language)}
                  </td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: '#f97316' }}>
                    {formatCurrency(row.bills, currency, language)}
                  </td>
                  <td className="px-3 py-2 tabular-nums font-semibold"
                    style={{ color: row.balance >= 0 ? '#10b981' : '#ef4444' }}>
                    {formatCurrency(row.balance, currency, language)}
                  </td>
                  <td className="px-3 py-2 tabular-nums"
                    style={{ color: row.savingsRate >= 0 ? '#10b981' : '#ef4444' }}>
                    {row.savingsRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────
// NET WORTH TAB
// ─────────────────────────────────────────────
function NetWorthTab({ allTxns, wallets, savingsEnvelopes, portfolios, latestValuations, currency, language, t }: {
  allTxns: Transaction[]
  wallets: ReturnType<typeof useWallets>['data']
  savingsEnvelopes: ReturnType<typeof useSavingsEnvelopesWithBalance>['data']
  portfolios: ReturnType<typeof usePortfolios>['data']
  latestValuations: Record<string, number>
  currency: string
  language: string
  t: (k: string) => string
}) {
  // Current values
  const walletsWithBalance = (wallets ?? []).map(w => ({
    ...w,
    current_balance: calcWalletBalance(w, allTxns),
  }))
  const totalWallets   = walletsWithBalance.filter(w => w.include_in_net_worth && w.current_balance > 0).reduce((s, w) => s + w.current_balance, 0)
  const totalLiabilities = walletsWithBalance.filter(w => w.include_in_net_worth && w.current_balance < 0).reduce((s, w) => s + Math.abs(w.current_balance), 0)
  const totalSavings   = (savingsEnvelopes ?? []).reduce((s, e) => s + (e.current_balance ?? 0), 0)
  const totalPortfolios = (portfolios ?? []).reduce((s, p) => {
    const val = latestValuations[p.id]
    if (val !== undefined) return s + val
    return s + allTxns.filter(t => t.portfolio_id === p.id && t.type === 'investment').reduce((ss, t) => ss + t.amount, 0)
  }, 0)
  const netWorth = totalWallets + totalSavings + totalPortfolios - totalLiabilities

  // Timeline
  const walletInitials = (wallets ?? []).reduce((s, w) => s + w.initial_balance, 0)
  const savingsInitials = (savingsEnvelopes ?? []).reduce((s, e) => s + e.initial_balance, 0)
  const timeline = useMemo(
    () => buildNetWorthTimeline(allTxns, walletInitials, savingsInitials),
    [allTxns, walletInitials, savingsInitials]
  )

  if (allTxns.length === 0) {
    return <EmptyState icon="📊" title="No data yet" description="Add transactions to track net worth over time." />
  }

  return (
    <div className="flex flex-col gap-5 pt-2">

      {/* Hero */}
      <div className="card p-5">
        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('analytics.netWorth')}
        </p>
        <p className="text-3xl font-bold tabular-nums"
          style={{ color: netWorth >= 0 ? 'var(--color-text-primary)' : '#ef4444' }}>
          {formatCurrency(netWorth, currency, language)}
        </p>

        {/* Breakdown pills */}
        <div className="flex flex-wrap gap-3 mt-4">
          <NetWorthPill label="Wallets" value={totalWallets} color="#0ea5e9" currency={currency} language={language} />
          <NetWorthPill label="Savings" value={totalSavings} color="#10b981" currency={currency} language={language} />
          {totalPortfolios > 0 && (
            <NetWorthPill label="Investments" value={totalPortfolios} color="#8b5cf6" currency={currency} language={language} />
          )}
          {totalLiabilities > 0 && (
            <NetWorthPill label="Liabilities" value={-totalLiabilities} color="#ef4444" currency={currency} language={language} />
          )}
        </div>
      </div>

      {/* Timeline line chart */}
      {timeline.length >= 2 && (
        <div className="card p-4">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Net worth over time
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeline} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false}
                tickFormatter={v => formatNumber(Math.abs(v), language).split(',')[0].split(' ')[0]} />
              <Tooltip {...tooltipStyle}
                formatter={currencyFmt(currency, language)} />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <Area type="monotone" dataKey="total" stroke="var(--color-accent)" strokeWidth={2}
                fill="url(#nwGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Asset composition */}
      <div className="card p-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Asset composition
        </p>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Wallets', value: totalWallets, color: '#0ea5e9', pct: netWorth > 0 ? (totalWallets / (netWorth + totalLiabilities)) * 100 : 0 },
            { label: 'Savings envelopes', value: totalSavings, color: '#10b981', pct: netWorth > 0 ? (totalSavings / (netWorth + totalLiabilities)) * 100 : 0 },
            { label: 'Investments', value: totalPortfolios, color: '#8b5cf6', pct: netWorth > 0 ? (totalPortfolios / (netWorth + totalLiabilities)) * 100 : 0 },
          ].filter(item => item.value > 0).map(item => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                </div>
                <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                  {formatCurrency(item.value, currency, language)}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, item.pct)}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NetWorthPill({ label, value, color, currency, language }: {
  label: string; value: number; color: string; currency: string; language: string
}) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
      <p className="text-[10px] font-medium" style={{ color }}>{label}</p>
      <p className="text-sm font-bold tabular-nums" style={{ color }}>
        {formatCurrency(value, currency, language)}
      </p>
    </div>
  )
}
