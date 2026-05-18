import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import { useAllTransactions } from '@/hooks/useTransactions'
import type {
  InvestmentPortfolio,
  InvestmentPortfolioInsert,
  InvestmentPortfolioUpdate,
  PortfolioValuation,
  PortfolioValuationInsert,
} from '@/types'

export const PORTFOLIOS_KEY = (hid: string) => ['portfolios', hid]
export const VALUATIONS_KEY = (pid: string) => ['valuations', pid]

// ─── fetch portfolios ─────────────────────────
async function fetchPortfolios(hid: string): Promise<InvestmentPortfolio[]> {
  const { data, error } = await supabase
    .from('investment_portfolios')
    .select('*')
    .eq('household_id', hid)
    .eq('archived', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as InvestmentPortfolio[]
}

// ─── fetch valuations for one portfolio ───────
async function fetchValuations(portfolioId: string): Promise<PortfolioValuation[]> {
  const { data, error } = await supabase
    .from('portfolio_valuations')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('valuation_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as PortfolioValuation[]
}

// ─── hooks ────────────────────────────────────
export function usePortfolios() {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  return useQuery({
    queryKey: PORTFOLIOS_KEY(hid),
    queryFn: () => fetchPortfolios(hid),
    enabled: !!hid,
  })
}

export function usePortfolioValuations(portfolioId: string | null) {
  return useQuery({
    queryKey: VALUATIONS_KEY(portfolioId ?? ''),
    queryFn: () => fetchValuations(portfolioId!),
    enabled: !!portfolioId,
  })
}

/** Portfolios enriched with total_deposited, latest_valuation, gain/loss */
export function usePortfoliosEnriched() {
  const query = usePortfolios()
  const { data: allTxns = [] } = useAllTransactions()

  const enriched = (query.data ?? []).map(p => {
    const total_deposited = allTxns
      .filter(t => t.portfolio_id === p.id && t.type === 'investment')
      .reduce((s, t) => s + t.amount, 0)

    return { ...p, total_deposited, latest_valuation: undefined as number | undefined, gain_loss: undefined as number | undefined, return_percent: undefined as number | undefined }
  })

  return { ...query, data: enriched }
}

// ─── create portfolio ────────────────────────
export function useCreatePortfolio() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (values: Omit<InvestmentPortfolioInsert, 'household_id' | 'archived' | 'sort_order'>) => {
      const { data, error } = await supabase
        .from('investment_portfolios')
        .insert({ ...values, household_id: activeHousehold!.id, archived: false, sort_order: 0 })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PORTFOLIOS_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Portfolio created' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── update portfolio ────────────────────────
export function useUpdatePortfolio() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, ...values }: InvestmentPortfolioUpdate & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('investment_portfolios').update(values as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PORTFOLIOS_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Portfolio updated' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── archive portfolio ───────────────────────
export function useArchivePortfolio() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('investment_portfolios').update({ archived: true } as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PORTFOLIOS_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Portfolio archived' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── add valuation ────────────────────────────
export function useAddValuation() {
  const qc = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (values: PortfolioValuationInsert) => {
      const { data, error } = await supabase
        .from('portfolio_valuations')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qc.invalidateQueries({ queryKey: VALUATIONS_KEY((data as any).portfolio_id) })
      addToast({ type: 'success', title: 'Valuation saved' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── delete valuation ─────────────────────────
export function useDeleteValuation() {
  const qc = useQueryClient()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, portfolioId }: { id: string; portfolioId: string }) => {
      const { error } = await supabase.from('portfolio_valuations').delete().eq('id', id)
      if (error) throw error
      return portfolioId
    },
    onSuccess: (portfolioId) => {
      qc.invalidateQueries({ queryKey: VALUATIONS_KEY(portfolioId) })
      addToast({ type: 'success', title: 'Valuation deleted' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}
