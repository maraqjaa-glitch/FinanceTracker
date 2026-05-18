import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import type { Transaction, TransactionInsert, TransactionUpdate, TransactionFilters } from '@/types'
import { startOfMonthISO, endOfMonthISO } from '@/utils/formatDate'

export const TXN_KEY = (hid: string, filters?: TransactionFilters) => ['transactions', hid, filters ?? {}]

// ─── core fetch ───────────────────────────────
async function fetchTransactions(
  householdId: string,
  filters?: TransactionFilters
): Promise<Transaction[]> {
  let q = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*),
      wallet:wallets!transactions_wallet_id_fkey(*),
      to_wallet:wallets!transactions_to_wallet_id_fkey(*)
    `)
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.dateRange) {
    q = q.gte('date', filters.dateRange.from).lte('date', filters.dateRange.to)
  }
  if (filters?.types?.length) {
    q = q.in('type', filters.types)
  }
  if (filters?.categoryIds?.length) {
    q = q.in('category_id', filters.categoryIds)
  }
  if (filters?.walletIds?.length) {
    q = q.in('wallet_id', filters.walletIds)
  }
  if (filters?.person) {
    q = q.eq('person', filters.person)
  }
  if (filters?.amountMin !== undefined) {
    q = q.gte('amount', filters.amountMin)
  }
  if (filters?.amountMax !== undefined) {
    q = q.lte('amount', filters.amountMax)
  }
  if (filters?.search) {
    q = q.ilike('description', `%${filters.search}%`)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as Transaction[]
}

// ─── all (no filters, for balance calculations) ──
export function useAllTransactions() {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  return useQuery({
    queryKey: TXN_KEY(hid),
    queryFn: () => fetchTransactions(hid),
    enabled: !!hid,
  })
}

// ─── filtered list ────────────────────────────
export function useTransactions(filters?: TransactionFilters) {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  return useQuery({
    queryKey: TXN_KEY(hid, filters),
    queryFn: () => fetchTransactions(hid, filters),
    enabled: !!hid,
  })
}

// ─── current month ────────────────────────────
export function useMonthTransactions(year: number, month: number) {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  const from = startOfMonthISO(year, month)
  const to   = endOfMonthISO(year, month)
  return useQuery({
    queryKey: TXN_KEY(hid, { dateRange: { from, to } }),
    queryFn: () => fetchTransactions(hid, { dateRange: { from, to } }),
    enabled: !!hid,
  })
}

// ─── single transaction ───────────────────────
export function useTransaction(id: string | null) {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          category:categories(*),
          wallet:wallets!transactions_wallet_id_fkey(*),
          to_wallet:wallets!transactions_to_wallet_id_fkey(*)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as Transaction
    },
    enabled: !!id && !!hid,
  })
}

// ─── create ───────────────────────────────────
export function useCreateTransaction() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()
  const { session } = useAuthStore()

  return useMutation({
    mutationFn: async (values: Omit<TransactionInsert, 'household_id' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...values,
          household_id: activeHousehold!.id,
          created_by: session?.user.id ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', activeHousehold?.id ?? ''] })
      addToast({ type: 'success', title: 'Transaction saved' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── update ───────────────────────────────────
export function useUpdateTransaction() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, ...values }: TransactionUpdate & { id: string }) => {
      const { error } = await supabase
        .from('transactions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(values as any)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['transactions', activeHousehold?.id ?? ''] })
      qc.invalidateQueries({ queryKey: ['transaction', (vars as { id: string }).id] })
      addToast({ type: 'success', title: 'Transaction updated' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

// ─── delete ───────────────────────────────────
export function useDeleteTransaction() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', activeHousehold?.id ?? ''] })
      addToast({ type: 'success', title: 'Transaction deleted' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}
