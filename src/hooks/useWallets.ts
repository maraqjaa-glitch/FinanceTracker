import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import type { Wallet, WalletUpdate, Transaction } from '@/types'
import { calcWalletBalance } from '@/utils/calculations'

const WALLETS_KEY = (hid: string) => ['wallets', hid]

// ─── fetch ────────────────────────────────────
async function fetchWallets(householdId: string): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('household_id', householdId)
    .eq('archived', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as Wallet[]
}

// ─── list hook ────────────────────────────────
export function useWallets() {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  return useQuery({
    queryKey: WALLETS_KEY(hid),
    queryFn: () => fetchWallets(hid),
    enabled: !!hid,
  })
}

/** Wallets enriched with computed current_balance */
export function useWalletsWithBalances(transactions: Transaction[]) {
  const query = useWallets()
  const wallets = (query.data ?? []).map(w => ({
    ...w,
    current_balance: calcWalletBalance(w, transactions),
  }))
  return { ...query, data: wallets }
}

// ─── create ───────────────────────────────────
export function useCreateWallet() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (values: Omit<WalletUpdate, 'archived'> & {
      name: string
      type: string
      currency: string
      icon: string
      color: string
      initial_balance: number
      include_in_net_worth: boolean
      credit_limit?: number
    }) => {
      const { data, error } = await supabase
        .from('wallets')
        .insert({
          name: values.name,
          type: values.type!,
          currency: values.currency!,
          icon: values.icon!,
          color: values.color!,
          initial_balance: values.initial_balance ?? 0,
          credit_limit: values.credit_limit ?? null,
          include_in_net_worth: values.include_in_net_worth ?? true,
          household_id: activeHousehold!.id,
          sort_order: 0,
          archived: false,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WALLETS_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Wallet created' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── update ───────────────────────────────────
export function useUpdateWallet() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, ...values }: WalletUpdate & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('wallets').update(values as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WALLETS_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Wallet updated' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── archive ──────────────────────────────────
export function useArchiveWallet() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('wallets').update({ archived: true } as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WALLETS_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Wallet archived' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}
