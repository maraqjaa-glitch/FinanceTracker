import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import type { RecurringTransaction, RecurringTransactionInsert, RecurringTransactionUpdate } from '@/types'
import { addDays, addWeeks, addMonths, addYears, format, parseISO } from 'date-fns'

const RECURRING_KEY = (hid: string) => ['recurring_transactions', hid]

async function fetchRecurring(hid: string): Promise<RecurringTransaction[]> {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*, category:categories(*), wallet:wallets(*)')
    .eq('household_id', hid)
    .order('next_due_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as RecurringTransaction[]
}

export function useRecurringTransactions() {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''
  return useQuery({
    queryKey: RECURRING_KEY(hid),
    queryFn: () => fetchRecurring(hid),
    enabled: !!hid,
  })
}

export function useCreateRecurring() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (values: Omit<RecurringTransactionInsert, 'household_id'>) => {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({ ...values, household_id: activeHousehold!.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECURRING_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Recurring transaction created' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

export function useUpdateRecurring() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, ...values }: RecurringTransactionUpdate & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('recurring_transactions').update(values as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECURRING_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Updated' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

export function useToggleRecurring() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('recurring_transactions').update({ active } as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECURRING_KEY(activeHousehold?.id ?? '') })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

export function useDeleteRecurring() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECURRING_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Recurring transaction deleted' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

/** Calculate the next due date based on frequency */
export function calcNextDueDate(
  currentDate: string,
  frequency: RecurringTransaction['frequency'],
  frequencyValue: number
): string {
  const base = parseISO(currentDate)
  let next: Date
  switch (frequency) {
    case 'daily':   next = addDays(base, frequencyValue);   break
    case 'weekly':  next = addWeeks(base, frequencyValue);  break
    case 'monthly': next = addMonths(base, frequencyValue); break
    case 'yearly':  next = addYears(base, frequencyValue);  break
    default:        next = addMonths(base, 1)
  }
  return format(next, 'yyyy-MM-dd')
}
