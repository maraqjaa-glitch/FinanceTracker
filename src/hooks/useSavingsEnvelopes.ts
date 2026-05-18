import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import { useAllTransactions } from '@/hooks/useTransactions'
import { calcEnvelopeBalance } from '@/utils/calculations'
import type { SavingsEnvelope, SavingsEnvelopeInsert, SavingsEnvelopeUpdate } from '@/types'

export const ENVELOPES_KEY = (hid: string) => ['savings_envelopes', hid]

async function fetchSavingsEnvelopes(hid: string): Promise<SavingsEnvelope[]> {
  const { data, error } = await supabase
    .from('savings_envelopes')
    .select('*')
    .eq('household_id', hid)
    .eq('archived', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as SavingsEnvelope[]
}

// ─── list ─────────────────────────────────────
export function useSavingsEnvelopes() {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  return useQuery({
    queryKey: ENVELOPES_KEY(hid),
    queryFn: () => fetchSavingsEnvelopes(hid),
    enabled: !!hid,
  })
}

/** Envelopes enriched with live current_balance and progress_percent */
export function useSavingsEnvelopesWithBalance() {
  const envelopesQuery = useSavingsEnvelopes()
  const { data: transactions = [] } = useAllTransactions()

  const enriched = (envelopesQuery.data ?? []).map(env => {
    const current_balance = calcEnvelopeBalance(env.initial_balance, env.id, transactions)
    const progress_percent = env.target_amount
      ? Math.min(100, (current_balance / env.target_amount) * 100)
      : undefined
    return { ...env, current_balance, progress_percent }
  })

  return { ...envelopesQuery, data: enriched }
}

// ─── create ───────────────────────────────────
export function useCreateSavingsEnvelope() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (values: Omit<SavingsEnvelopeInsert, 'household_id' | 'archived' | 'sort_order'>) => {
      const { data, error } = await supabase
        .from('savings_envelopes')
        .insert({ ...values, household_id: activeHousehold!.id, archived: false, sort_order: 0 })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENVELOPES_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Savings envelope created' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── update ───────────────────────────────────
export function useUpdateSavingsEnvelope() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, ...values }: SavingsEnvelopeUpdate & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('savings_envelopes').update(values as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENVELOPES_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Savings envelope updated' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── archive ──────────────────────────────────
export function useArchiveSavingsEnvelope() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('savings_envelopes').update({ archived: true } as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENVELOPES_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Envelope archived' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}
