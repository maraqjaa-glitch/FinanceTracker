// ─────────────────────────────────────────────
// FinFort 2.0 — TypeScript Domain Types
// Mirrors the Supabase database schema exactly.
// No `any` — all types are explicit.
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// ENUMS / LITERAL UNIONS
// ─────────────────────────────────────────────

export type Theme = 'dark' | 'light' | 'system'

export type Language = 'pl' | 'en'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'bill'
  | 'transfer'
  | 'savings_deposit'
  | 'savings_withdrawal'
  | 'investment'

export type CategoryType = 'income' | 'expense' | 'bill' | 'transfer'

export type WalletType = 'cash' | 'bank' | 'credit_card' | 'savings' | 'investment' | 'other'

export type PortfolioType =
  | 'stocks'
  | 'crypto'
  | 'gold'
  | 'bonds'
  | 'real_estate'
  | 'pension'
  | 'other'

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type HouseholdRole = 'owner' | 'member'

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export type ExchangeRateSource = 'api' | 'manual'

// ─────────────────────────────────────────────
// ACTIVE MODULES
// ─────────────────────────────────────────────

export interface ActiveModules {
  budget: boolean
  savings_envelopes: boolean
  budget_envelopes: boolean
  investments: boolean
  portfolios: boolean
}

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  preferred_currency: string
  language: Language
  theme: Theme
  accent_color: string
  monthly_income: number | null
  onboarding_completed: boolean
  active_modules: ActiveModules
  created_at: string
  updated_at: string
}

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>

// ─────────────────────────────────────────────
// HOUSEHOLD
// ─────────────────────────────────────────────

export interface Household {
  id: string
  name: string
  created_by: string | null
  created_at: string
}

export type HouseholdInsert = Pick<Household, 'name'> & { created_by?: string }
export type HouseholdUpdate = Pick<Household, 'name'>

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: HouseholdRole
  joined_at: string
  // Joined fields (from queries)
  profile?: Profile
}

export interface HouseholdInvitation {
  id: string
  household_id: string
  invited_email: string
  invited_by: string
  token: string
  status: InvitationStatus
  expires_at: string
  created_at: string
  // Joined
  household?: Household
  inviter?: Profile
}

export type HouseholdInvitationInsert = Pick<
  HouseholdInvitation,
  'household_id' | 'invited_email' | 'invited_by'
>

// ─────────────────────────────────────────────
// CATEGORY
// ─────────────────────────────────────────────

export interface Category {
  id: string
  household_id: string | null
  user_id: string | null
  type: CategoryType
  name_pl: string
  name_en: string
  icon: string
  color: string
  is_system: boolean
  sort_order: number
  created_at: string
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at' | 'is_system'> & {
  is_system?: boolean
}
export type CategoryUpdate = Partial<
  Pick<Category, 'name_pl' | 'name_en' | 'icon' | 'color' | 'sort_order' | 'type'>
>

// Helper: get localised category name
export function getCategoryName(category: Category, language: Language): string {
  return language === 'pl' ? category.name_pl : category.name_en
}

// ─────────────────────────────────────────────
// WALLET
// ─────────────────────────────────────────────

export interface Wallet {
  id: string
  household_id: string
  name: string
  type: WalletType
  currency: string
  icon: string
  color: string
  initial_balance: number
  credit_limit: number | null
  include_in_net_worth: boolean
  sort_order: number
  archived: boolean
  created_at: string
  // Calculated client-side (never stored)
  current_balance?: number
}

export type WalletInsert = Omit<Wallet, 'id' | 'created_at' | 'current_balance'>
export type WalletUpdate = Partial<Omit<Wallet, 'id' | 'household_id' | 'created_at' | 'current_balance'>>

// ─────────────────────────────────────────────
// SAVINGS ENVELOPE
// ─────────────────────────────────────────────

export interface SavingsEnvelope {
  id: string
  household_id: string
  name: string
  icon: string
  color: string
  target_amount: number | null
  initial_balance: number
  currency: string
  target_date: string | null
  notes: string | null
  archived: boolean
  sort_order: number
  created_at: string
  // Calculated client-side
  current_balance?: number
  progress_percent?: number
}

export type SavingsEnvelopeInsert = Omit<
  SavingsEnvelope,
  'id' | 'created_at' | 'current_balance' | 'progress_percent'
>
export type SavingsEnvelopeUpdate = Partial<
  Omit<SavingsEnvelope, 'id' | 'household_id' | 'created_at' | 'current_balance' | 'progress_percent'>
>

// ─────────────────────────────────────────────
// BUDGET ENVELOPE
// ─────────────────────────────────────────────

export interface BudgetEnvelope {
  id: string
  household_id: string
  category_id: string | null
  name: string
  icon: string
  color: string
  monthly_limit: number
  currency: string
  rollover: boolean
  archived: boolean
  sort_order: number
  created_at: string
  // Joined
  category?: Category
  // Calculated client-side
  spent_this_month?: number
  remaining?: number
  usage_percent?: number
}

export type BudgetEnvelopeInsert = Omit<
  BudgetEnvelope,
  'id' | 'created_at' | 'category' | 'spent_this_month' | 'remaining' | 'usage_percent'
>
export type BudgetEnvelopeUpdate = Partial<
  Omit<
    BudgetEnvelope,
    'id' | 'household_id' | 'created_at' | 'category' | 'spent_this_month' | 'remaining' | 'usage_percent'
  >
>

// ─────────────────────────────────────────────
// INVESTMENT PORTFOLIO
// ─────────────────────────────────────────────

export interface InvestmentPortfolio {
  id: string
  household_id: string
  name: string
  type: PortfolioType
  icon: string
  color: string
  currency: string
  institution: string | null
  notes: string | null
  archived: boolean
  sort_order: number
  created_at: string
  // Calculated client-side
  total_deposited?: number
  latest_valuation?: number
  gain_loss?: number
  return_percent?: number
}

export type InvestmentPortfolioInsert = Omit<
  InvestmentPortfolio,
  'id' | 'created_at' | 'total_deposited' | 'latest_valuation' | 'gain_loss' | 'return_percent'
>
export type InvestmentPortfolioUpdate = Partial<
  Omit<
    InvestmentPortfolio,
    'id' | 'household_id' | 'created_at' | 'total_deposited' | 'latest_valuation' | 'gain_loss' | 'return_percent'
  >
>

// ─────────────────────────────────────────────
// PORTFOLIO VALUATION
// ─────────────────────────────────────────────

export interface PortfolioValuation {
  id: string
  portfolio_id: string
  valuation_date: string
  current_value: number
  notes: string | null
  created_at: string
}

export type PortfolioValuationInsert = Omit<PortfolioValuation, 'id' | 'created_at'>
export type PortfolioValuationUpdate = Partial<
  Pick<PortfolioValuation, 'current_value' | 'valuation_date' | 'notes'>
>

// ─────────────────────────────────────────────
// TRANSACTION
// ─────────────────────────────────────────────

export interface Transaction {
  id: string
  household_id: string
  created_by: string | null
  type: TransactionType
  category_id: string | null
  wallet_id: string | null
  to_wallet_id: string | null
  savings_envelope_id: string | null
  budget_envelope_id: string | null
  portfolio_id: string | null
  amount: number
  currency: string
  amount_in_base_currency: number | null
  exchange_rate: number | null
  date: string
  description: string | null
  notes: string | null
  tags: string[]
  person: string | null
  is_recurring: boolean
  recurring_id: string | null
  import_hash: string | null
  created_at: string
  updated_at: string
  // Joined fields (populated by queries)
  category?: Category
  wallet?: Wallet
  to_wallet?: Wallet
  savings_envelope?: SavingsEnvelope
  budget_envelope?: BudgetEnvelope
  portfolio?: InvestmentPortfolio
  creator?: Profile
}

export type TransactionInsert = Omit<
  Transaction,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'category'
  | 'wallet'
  | 'to_wallet'
  | 'savings_envelope'
  | 'budget_envelope'
  | 'portfolio'
  | 'creator'
>
export type TransactionUpdate = Partial<
  Omit<
    Transaction,
    | 'id'
    | 'household_id'
    | 'created_at'
    | 'updated_at'
    | 'category'
    | 'wallet'
    | 'to_wallet'
    | 'savings_envelope'
    | 'budget_envelope'
    | 'portfolio'
    | 'creator'
  >
>

// ─────────────────────────────────────────────
// RECURRING TRANSACTION
// ─────────────────────────────────────────────

export interface RecurringTransaction {
  id: string
  household_id: string
  type: TransactionType
  category_id: string | null
  wallet_id: string | null
  amount: number
  currency: string
  description: string
  frequency: RecurringFrequency
  frequency_value: number
  start_date: string
  end_date: string | null
  next_due_date: string
  active: boolean
  created_at: string
  // Joined
  category?: Category
  wallet?: Wallet
}

export type RecurringTransactionInsert = Omit<
  RecurringTransaction,
  'id' | 'created_at' | 'category' | 'wallet'
>
export type RecurringTransactionUpdate = Partial<
  Omit<RecurringTransaction, 'id' | 'household_id' | 'created_at' | 'category' | 'wallet'>
>

// ─────────────────────────────────────────────
// EXCHANGE RATE
// ─────────────────────────────────────────────

export interface ExchangeRate {
  id: string
  base_currency: string
  target_currency: string
  rate: number
  source: ExchangeRateSource
  fetched_at: string
}

// ─────────────────────────────────────────────
// UI / FILTER TYPES
// ─────────────────────────────────────────────

export interface DateRange {
  from: string // ISO date string YYYY-MM-DD
  to: string
}

export interface TransactionFilters {
  dateRange?: DateRange
  types?: TransactionType[]
  categoryIds?: string[]
  walletIds?: string[]
  person?: string
  amountMin?: number
  amountMax?: number
  search?: string
}

export interface MonthYear {
  month: number // 1-12
  year: number
}

// ─────────────────────────────────────────────
// DASHBOARD SUMMARY TYPES
// ─────────────────────────────────────────────

export interface MonthlySummary {
  month: MonthYear
  total_income: number
  total_bills: number
  total_expenses: number
  balance: number
  savings_rate: number
}

export interface NetWorthSnapshot {
  date: string
  total_assets: number
  total_liabilities: number
  net_worth: number
  wallet_total: number
  savings_total: number
  portfolio_total: number
}

// ─────────────────────────────────────────────
// FORM TYPES (React Hook Form shapes)
// ─────────────────────────────────────────────

export interface TransactionFormValues {
  type: TransactionType
  amount: number
  currency: string
  date: string
  category_id: string
  wallet_id: string
  to_wallet_id?: string
  savings_envelope_id?: string
  portfolio_id?: string
  description: string
  notes?: string
  person?: string
  tags?: string[]
  is_recurring: boolean
  recurring_frequency?: RecurringFrequency
  recurring_frequency_value?: number
  recurring_end_date?: string
}

export interface WalletFormValues {
  name: string
  type: WalletType
  currency: string
  icon: string
  color: string
  initial_balance: number
  credit_limit?: number
  include_in_net_worth: boolean
}

export interface SavingsEnvelopeFormValues {
  name: string
  icon: string
  color: string
  target_amount?: number
  initial_balance: number
  currency: string
  target_date?: string
  notes?: string
}

export interface BudgetEnvelopeFormValues {
  name: string
  icon: string
  color: string
  category_id?: string
  monthly_limit: number
  currency: string
  rollover: boolean
}

export interface ProfileFormValues {
  full_name: string
  avatar_url?: string
  preferred_currency: string
  language: Language
  theme: Theme
  accent_color: string
  monthly_income?: number
}

export interface CategoryFormValues {
  type: CategoryType
  name_pl: string
  name_en: string
  icon: string
  color: string
}

export interface InvestmentPortfolioFormValues {
  name: string
  type: PortfolioType
  icon: string
  color: string
  currency: string
  institution?: string
  notes?: string
}

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────

export interface OnboardingState {
  step: number
  full_name: string
  avatar_url: string
  language: Language
  preferred_currency: string
  theme: Theme
  accent_color: string
  household_mode: 'create' | 'join' | 'solo'
  household_name: string
  invitation_token: string
  active_modules: ActiveModules
  monthly_income?: number
  first_wallet?: WalletFormValues
}

// ─────────────────────────────────────────────
// CSV IMPORT
// ─────────────────────────────────────────────

export interface CSVColumnMapping {
  date: string
  amount: string
  description: string
  type?: string
  category?: string
}

export interface CSVImportSettings {
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  decimalSeparator: '.' | ','
  wallet_id: string
  skip_duplicates: boolean
  type_income_values: string[]
  type_expense_values: string[]
}

export interface CSVImportResult {
  imported: number
  skipped: number
  errors: number
  error_rows: Array<{ row: number; reason: string }>
}

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────

export interface CategoryBreakdown {
  category_id: string
  category: Category
  total: number
  count: number
  percentage: number
}

export interface MonthlyTrend {
  month: string // YYYY-MM
  income: number
  expenses: number
  bills: number
  savings: number
  balance: number
  savings_rate: number
}

export interface YearComparison {
  month: number // 1-12
  current_year: number
  previous_year: number
  change_percent: number
}
