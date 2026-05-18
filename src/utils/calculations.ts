import type { Transaction, Wallet, TransactionType } from '@/types'

// ─── Which transaction types affect a wallet balance ─
const INCOME_TYPES: TransactionType[] = ['income', 'savings_withdrawal']
const EXPENSE_TYPES: TransactionType[] = ['expense', 'bill', 'savings_deposit', 'investment']

/** Calculate the current balance of a wallet from its transactions */
export function calcWalletBalance(
  wallet: Wallet,
  transactions: Transaction[]
): number {
  const walletTxns = transactions.filter(
    t => t.wallet_id === wallet.id || t.to_wallet_id === wallet.id
  )
  const delta = walletTxns.reduce((sum, t) => {
    if (t.type === 'transfer') {
      if (t.to_wallet_id === wallet.id) return sum + t.amount   // incoming transfer
      if (t.wallet_id  === wallet.id) return sum - t.amount   // outgoing transfer
    }
    if (INCOME_TYPES.includes(t.type) && t.wallet_id === wallet.id)  return sum + t.amount
    if (EXPENSE_TYPES.includes(t.type) && t.wallet_id === wallet.id) return sum - t.amount
    return sum
  }, 0)
  return wallet.initial_balance + delta
}

/** Calculate the current balance of a savings envelope */
export function calcEnvelopeBalance(
  initialBalance: number,
  envelopeId: string,
  transactions: Transaction[]
): number {
  const txns = transactions.filter(t => t.savings_envelope_id === envelopeId)
  const delta = txns.reduce((sum, t) => {
    if (t.type === 'savings_deposit')    return sum + t.amount
    if (t.type === 'savings_withdrawal') return sum - t.amount
    return sum
  }, 0)
  return initialBalance + delta
}

/** Monthly summary for dashboard */
export function calcMonthlySummary(transactions: Transaction[], monthlyIncome?: number | null) {
  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const bills    = transactions.filter(t => t.type === 'bill').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance  = income - bills - expenses
  const base     = monthlyIncome && monthlyIncome > 0 ? monthlyIncome : income
  const savingsRate = base > 0 ? Math.round((balance / base) * 100) : 0
  return { income, bills, expenses, balance, savingsRate }
}

/** Type → colour mapping used across the app */
export function txTypeColor(type: TransactionType): string {
  switch (type) {
    case 'income':             return '#10b981'
    case 'expense':            return '#ef4444'
    case 'bill':               return '#f97316'
    case 'savings_deposit':    return '#0ea5e9'
    case 'savings_withdrawal': return '#0ea5e9'
    case 'investment':         return '#8b5cf6'
    case 'transfer':           return '#94a3b8'
  }
}

/** Sign: income/savings_withdrawal = positive, everything else = negative */
export function txAmountSign(type: TransactionType): 1 | -1 {
  return INCOME_TYPES.includes(type) ? 1 : -1
}

// ─────────────────────────────────────────────
// ANALYTICS HELPERS
// ─────────────────────────────────────────────

export interface MonthKey { year: number; month: number }
export interface MonthlyAgg {
  key: string      // "YYYY-MM"
  label: string    // "Jan 24"
  income: number
  bills: number
  expenses: number
  balance: number
  savingsRate: number
}

/** Build a map of "YYYY-MM" → MonthlyAgg from a flat transaction array */
export function buildMonthlyAgg(transactions: Transaction[]): Record<string, MonthlyAgg> {
  const map: Record<string, MonthlyAgg> = {}

  for (const t of transactions) {
    const [yearStr, monthStr] = t.date.split('-')
    const key = `${yearStr}-${monthStr}`
    if (!map[key]) {
      const d = new Date(parseInt(yearStr), parseInt(monthStr) - 1)
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
      map[key] = { key, label, income: 0, bills: 0, expenses: 0, balance: 0, savingsRate: 0 }
    }
    if (t.type === 'income')  map[key].income   += t.amount
    if (t.type === 'bill')    map[key].bills    += t.amount
    if (t.type === 'expense') map[key].expenses += t.amount
  }

  // Calculate balance & savings rate for each month
  for (const agg of Object.values(map)) {
    agg.balance = agg.income - agg.bills - agg.expenses
    const base = agg.income > 0 ? agg.income : 1
    agg.savingsRate = Math.round((agg.balance / base) * 100)
  }

  return map
}

/** Get last N months as "YYYY-MM" keys, inclusive of current */
export function lastNMonths(n: number): string[] {
  const now = new Date()
  const result: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

export interface CategoryTotal {
  categoryId: string
  categoryName: string
  icon: string
  color: string
  total: number
  count: number
  percentage: number
}

/** Aggregate transactions by category, return sorted by total desc */
export function aggregateByCategory(
  transactions: Transaction[],
  types: TransactionType[],
  language: 'pl' | 'en' = 'en'
): CategoryTotal[] {
  const map: Record<string, CategoryTotal> = {}

  for (const t of transactions) {
    if (!types.includes(t.type)) continue
    const catId   = t.category_id ?? '__none__'
    const catName = t.category
      ? (language === 'pl' ? t.category.name_pl : t.category.name_en)
      : 'Uncategorised'
    const icon  = t.category?.icon  ?? '❓'
    const color = t.category?.color ?? '#6b7280'

    if (!map[catId]) {
      map[catId] = { categoryId: catId, categoryName: catName, icon, color, total: 0, count: 0, percentage: 0 }
    }
    map[catId].total += t.amount
    map[catId].count++
  }

  const arr = Object.values(map).sort((a, b) => b.total - a.total)
  const grandTotal = arr.reduce((s, c) => s + c.total, 0)
  if (grandTotal > 0) {
    arr.forEach(c => { c.percentage = Math.round((c.total / grandTotal) * 100) })
  }
  return arr
}

/** Build YoY comparison data: for each month (1–12), current vs previous year */
export interface YoYRow {
  monthLabel: string  // "Jan", "Feb"…
  current: number
  previous: number
}
export function buildYoYComparison(
  transactions: Transaction[],
  types: TransactionType[],
  currentYear: number
): YoYRow[] {
  const rows: YoYRow[] = []
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  for (let m = 1; m <= 12; m++) {
    const curKey  = `${currentYear}-${String(m).padStart(2,'0')}`
    const prevKey = `${currentYear - 1}-${String(m).padStart(2,'0')}`
    const agg = buildMonthlyAgg(transactions)

    const current  = types.reduce((s, tp) => {
      const a = agg[curKey]
      if (!a) return s
      if (tp === 'income')  return s + a.income
      if (tp === 'expense') return s + a.expenses
      if (tp === 'bill')    return s + a.bills
      return s
    }, 0)
    const previous = types.reduce((s, tp) => {
      const a = agg[prevKey]
      if (!a) return s
      if (tp === 'income')  return s + a.income
      if (tp === 'expense') return s + a.expenses
      if (tp === 'bill')    return s + a.bills
      return s
    }, 0)

    rows.push({ monthLabel: months[m - 1], current, previous })
  }
  return rows
}

/** Build net-worth running total from all transactions + wallet initial balances */
export interface NetWorthPoint {
  key: string   // "YYYY-MM"
  label: string
  wallets: number
  savings: number
  total: number
}
export function buildNetWorthTimeline(
  transactions: Transaction[],
  walletInitials: number,
  savingsInitials: number
): NetWorthPoint[] {
  const agg = buildMonthlyAgg(transactions)
  const sortedKeys = Object.keys(agg).sort()
  if (sortedKeys.length === 0) return []

  let running = walletInitials + savingsInitials
  return sortedKeys.map(key => {
    const m = agg[key]
    running += m.balance
    const d = new Date(parseInt(key.split('-')[0]), parseInt(key.split('-')[1]) - 1)
    return {
      key,
      label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      wallets: running,
      savings: savingsInitials,
      total: running,
    }
  })
}
