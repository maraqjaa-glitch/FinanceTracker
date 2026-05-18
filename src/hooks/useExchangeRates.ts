import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { fetchAndCacheRates, fetchBTCRate, convertAmount as _convertAmount } from '@/lib/currencies'
import { supabase } from '@/lib/supabase'

export const RATES_KEY = (base: string) => ['exchange_rates', base]

// ─── Fetch & cache rates ──────────────────────
export function useExchangeRates(baseCurrency?: string) {
  const { profile } = useAuthStore()
  const base = baseCurrency ?? profile?.preferred_currency ?? 'PLN'

  return useQuery({
    queryKey: RATES_KEY(base),
    queryFn: () => fetchAndCacheRates(base),
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
    gcTime: 1000 * 60 * 60 * 8,
    enabled: base !== 'BTC',       // BTC fetched separately
  })
}

// ─── BTC rate ────────────────────────────────
export function useBTCRate() {
  const { profile } = useAuthStore()
  const target = profile?.preferred_currency ?? 'PLN'

  return useQuery({
    queryKey: ['btc_rate', target],
    queryFn: () => fetchBTCRate(target),
    staleTime: 1000 * 60 * 60 * 4,
  })
}

// ─── All cached rates from Supabase ──────────
export function useAllCachedRates(baseCurrency?: string) {
  const { profile } = useAuthStore()
  const base = baseCurrency ?? profile?.preferred_currency ?? 'PLN'

  return useQuery({
    queryKey: ['all_cached_rates', base],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('base_currency', base)
        .order('target_currency', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 30,
  })
}

// ─── Manual refresh ───────────────────────────
export function useRefreshRates() {
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  const { addToast } = useUIStore()
  const base = profile?.preferred_currency ?? 'PLN'

  return useMutation({
    mutationFn: async () => {
      // Force-delete stale marker so fetchAndCacheRates re-fetches
      await supabase
        .from('exchange_rates')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ fetched_at: new Date(0).toISOString() } as any)
        .eq('base_currency', base)

      const rates = await fetchAndCacheRates(base)
      // Also try BTC
      const btc = await fetchBTCRate(base)
      return { rates, btc }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RATES_KEY(base) })
      qc.invalidateQueries({ queryKey: ['all_cached_rates', base] })
      qc.invalidateQueries({ queryKey: ['btc_rate', base] })
      addToast({ type: 'success', title: 'Exchange rates updated' })
    },
    onError: () => addToast({ type: 'error', title: 'Failed to update rates' }),
  })
}

// ─── Convenience converter hook ───────────────
export function useConvertAmount() {
  const { profile } = useAuthStore()
  const base = profile?.preferred_currency ?? 'PLN'
  const { data: rates = {} } = useExchangeRates(base)

  return (amount: number, from: string, to: string) =>
    _convertAmount(amount, from, to, rates)
}
