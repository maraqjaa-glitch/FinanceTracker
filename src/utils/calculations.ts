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
