import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHouseholdStore } from '@/store/householdStore'
import { useUIStore } from '@/store/uiStore'
import type { Category, CategoryType } from '@/types'

const CATS_KEY = (hid: string) => ['categories', hid]

async function fetchCategories(householdId: string): Promise<Category[]> {
  // System categories (no household_id) + household-specific categories
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`is_system.eq.true,household_id.eq.${householdId}`)
    .order('sort_order', { ascending: true })
    .order('name_en', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as Category[]
}

export function useCategories(typeFilter?: CategoryType) {
  const { activeHousehold } = useHouseholdStore()
  const hid = activeHousehold?.id ?? ''

  return useQuery({
    queryKey: [...CATS_KEY(hid), typeFilter],
    queryFn: async () => {
      const all = await fetchCategories(hid)
      return typeFilter ? all.filter(c => c.type === typeFilter) : all
    },
    enabled: !!hid,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (values: Omit<Category, 'id' | 'created_at' | 'is_system'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...values, household_id: activeHousehold!.id, is_system: false })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATS_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Category created' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  const { activeHousehold } = useHouseholdStore()
  const { addToast } = useUIStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CATS_KEY(activeHousehold?.id ?? '') })
      addToast({ type: 'success', title: 'Category deleted' })
    },
    onError: (e: Error) => addToast({ type: 'error', title: e.message }),
  })
}
