import { supabase } from './supabase'

export const SUPPORTED_CURRENCIES = [
  { code: 'PLN', name: 'Polski złoty', flag: '🇵🇱' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', flag: '🇺🇦' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
  { code: 'BTC', name: 'Bitcoin', flag: '₿' },
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code']

/** Fetch latest rates from Frankfurter API and cache in Supabase */
export async function fetchAndCacheRates(baseCurrency: string): Promise<Record<string, number>> {
  try {
    // Check if cached rates are fresh (< 4 hours old)
    const { data: cached } = await supabase
      .from('exchange_rates')
      .select('id')
      .eq('base_currency', baseCurrency)
      .gte('fetched_at', new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString())
      .limit(1)

    if (cached && cached.length > 0) {
      // Build rates map from cache
      const { data: allRates } = await supabase
        .from('exchange_rates')
        .select('target_currency, rate')
        .eq('base_currency', baseCurrency)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return Object.fromEntries((allRates ?? []).map((r: any) => [r.target_currency, r.rate]))
    }

    // Fetch fresh rates
    const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`)
    if (!res.ok) throw new Error(`Frankfurter API error: ${res.status}`)
    const data: { rates: Record<string, number> } = await res.json()

    // Upsert into Supabase
    const upsertData = Object.entries(data.rates).map(([target, rate]) => ({
      base_currency: baseCurrency,
      target_currency: target,
      rate,
      source: 'api' as const,
      fetched_at: new Date().toISOString(),
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('exchange_rates') as any).upsert(upsertData, {
      onConflict: 'base_currency,target_currency',
    })

    return data.rates
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    return {}
  }
}

/** Fetch BTC price from CoinGecko (free tier) */
export async function fetchBTCRate(targetCurrency: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${targetCurrency.toLowerCase()}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.bitcoin?.[targetCurrency.toLowerCase()] ?? null
  } catch {
    return null
  }
}

/** Convert an amount from one currency to another using cached rates */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount
  const rate = rates[toCurrency]
  if (!rate) return amount
  return amount * rate
}
