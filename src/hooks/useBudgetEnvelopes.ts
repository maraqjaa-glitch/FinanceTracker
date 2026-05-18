import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import type { BudgetEnvelope, BudgetEnvelopeInsert, BudgetEnvelopeUpdate, Transaction } from '@/types'

export const BUDGET_KEY = (hid: string) => ['budget_envelopes', hid]

async function fetchBudgetEnvelopes(hid: string): Promise<BudgetEnvelope[]> {
  const { data, error } = await supabase
    .from('budget_envelopes')
    .select('*, category:categories(*)')
    .eq('household_id', hid)
    .eq('archived', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as BudgetEnvelope[]
}

// ─── list ─────────────────────────────────────
export function useBudgetEnvelopes() {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  return useQuery({
    queryKey: BUDGET_KEY(hid),
    queryFn: () => fetchBudgetEnvelopes(hid),
    enabled: !!hid,
  })
}

/** Budget envelopes enriched with current month's spending */
export function useBudgetEnvelopesWithSpend(monthTransactions: Transaction[]) {
  const query = useBudgetEnvelopes()

  const enriched = (query.data ?? []).map(env => {
    // Sum expense transactions for this envelope's category this month
    const spent_this_month = monthTransactions
      .filter(t =>
        ['expense', 'bill'].includes(t.type) &&
        env.category_id &&
        t.category_id === env.category_id
      )
      .reduce((sum, t) => sum + t.amount, 0)

    const remaining = Math.max(0, env.monthly_limit - spent_this_month)
    const usage_percent = env.monthly_limit > 0
      ? Math.min(100, (spent_this_month / env.monthly_limit) * 100)
      : 0

    return { ...env, spent_this_month, remaining, usage_percent }
  })

  return { ...query, data: enriched }
}

// ─── create ───────────────────────────────────
export function useCreateBudgetEnvelope() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (values: Omit<BudgetEnvelopeInsert, 'household_id' | 'archived' | 'sort_order'>) => {
      const { data, error } = await supabase
        .from('budget_envelopes')
        .insert({ ...values, household_id: activeHousehold!.id, archived: false, sort_order: 0 })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BUDGET_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Budget envelope created' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── update ───────────────────────────────────
export function useUpdateBudgetEnvelope() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, ...values }: BudgetEnvelopeUpdate & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('budget_envelopes').update(values as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BUDGET_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Budget envelope updated' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── archive ──────────────────────────────────
export function useArchiveBudgetEnvelope() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('budget_envelopes').update({ archived: true } as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BUDGET_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Budget envelope archived' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}
