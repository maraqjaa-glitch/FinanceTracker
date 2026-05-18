import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Clock, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import TopHeader from '@/components/layout/TopHeader'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useExchangeRates, useAllCachedRates, useRefreshRates, useBTCRate } from '@/hooks/useExchangeRates'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { formatCurrency } from '@/utils/formatCurrency'
import { SUPPORTED_CURRENCIES } from '@/lib/currencies'

export default function CurrenciesPage() {
  const { t } = useTranslation()
  const { profile, updateProfile } = useAuthStore()
  const { language } = useUIStore()
  const baseCurrency = profile?.preferred_currency ?? 'PLN'

  const { data: rates = {}, isLoading: ratesLoading } = useExchangeRates(baseCurrency)
  const { data: cachedRates = [], isLoading: cacheLoading } = useAllCachedRates(baseCurrency)
  const { data: btcRate }   = useBTCRate()
  const refreshMut          = useRefreshRates()

  // Latest fetch timestamp
  const latestFetchedAt = cachedRates.length > 0
    ? (cachedRates as Array<{ fetched_at: string }>)
        .map(r => r.fetched_at)
        .sort()
        [cachedRates.length - 1]
    : null

  const handleChangeCurrency = async (code: string) => {
    if (code === baseCurrency) return
    await updateProfile({ preferred_currency: code })
  }

  // Rates to display — our supported list + BTC
  const displayRates = SUPPORTED_CURRENCIES
    .filter(c => c.code !== baseCurrency)
    .map(c => {
      if (c.code === 'BTC') {
        return { ...c, rate: btcRate ?? null }
      }
      const rate = rates[c.code]
      return { ...c, rate: rate ?? null }
    })

  return (
    <div>
      <TopHeader title={t('settings.currencies')} showBack />

      <div className="px-4 py-4 flex flex-col gap-5">

        {/* ── Base currency selector ── */}
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
            {t('settings.currency')} (base)
          </p>
          <div className="card p-4">
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
              All totals on the dashboard and analytics are shown in this currency.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_CURRENCIES.filter(c => c.code !== 'BTC').map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleChangeCurrency(c.code)}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: baseCurrency === c.code ? 'var(--color-accent)' : 'var(--color-bg-elevated)',
                    color: baseCurrency === c.code ? '#fff' : 'var(--color-text-secondary)',
                    border: `1px solid ${baseCurrency === c.code ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  <span>{c.flag}</span>
                  <span>{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Refresh header ── */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              Live rates — base: {baseCurrency}
            </p>
            {latestFetchedAt && (
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" style={{ color: 'var(--color-text-muted)' }} />
                <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  Updated {formatDistanceToNow(new Date(latestFetchedAt), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => refreshMut.mutate()}
            disabled={refreshMut.isPending}
            className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshMut.isPending ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>

        {/* ── Rate list ── */}
        {ratesLoading || cacheLoading ? (
          <SkeletonList count={8} />
        ) : (
          <div className="card divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {displayRates.map(c => (
              <div key={c.code} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xl flex-shrink-0">{c.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {c.code}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {c.name}
                  </p>
                </div>

                {/* Rate display */}
                <div className="text-right flex-shrink-0">
                  {c.rate !== null ? (
                    <>
                      <p className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
                        {c.rate >= 100
                          ? c.rate.toFixed(0)
                          : c.rate >= 1
                          ? c.rate.toFixed(4)
                          : c.rate.toFixed(6)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        1 {baseCurrency} = {c.rate >= 100 ? c.rate.toFixed(0) : c.rate.toFixed(4)} {c.code}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      n/a
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Converter ── */}
        <CurrencyConverter baseCurrency={baseCurrency} rates={rates} language={language} />

        {/* ── Data source info ── */}
        <div
          className="rounded-2xl p-4 text-xs"
          style={{ backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Data sources
          </p>
          <p>• Fiat rates: <span className="font-mono">api.frankfurter.app</span> (ECB data, free)</p>
          <p>• Bitcoin: <span className="font-mono">api.coingecko.com</span> (free tier)</p>
          <p className="mt-1">Rates are cached for 4 hours. Tap "Refresh" for latest data.</p>
        </div>
      </div>
    </div>
  )
}

// ─── Simple converter widget ──────────────────
function CurrencyConverter({ baseCurrency, rates, language }: {
  baseCurrency: string
  rates: Record<string, number>
  language: string
}) {
  const [amount, setAmount]   = useState(100)
  const [fromCur, setFromCur] = useState(baseCurrency)
  const [toCur, setToCur]     = useState(baseCurrency === 'PLN' ? 'EUR' : 'PLN')

  // Convert: go through base if needed
  function convert(amt: number, from: string, to: string): number {
    if (from === to) return amt
    if (from === baseCurrency) return amt * (rates[to] ?? 1)
    if (to === baseCurrency) return amt / (rates[from] ?? 1)
    // Cross rate: from → base → to
    const inBase = amt / (rates[from] ?? 1)
    return inBase * (rates[to] ?? 1)
  }

  const result = convert(amount, fromCur, toCur)

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Quick converter
      </p>

      <div className="flex items-center gap-2">
        {/* From */}
        <div className="flex-1">
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(parseFloat(e.target.value) || 0)}
            className="input text-lg font-bold tabular-nums"
          />
          <select
            value={fromCur}
            onChange={e => setFromCur(e.target.value)}
            className="input mt-1.5 text-xs"
          >
            {SUPPORTED_CURRENCIES.filter(c => c.code !== 'BTC').map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
        </div>

        {/* Arrow */}
        <div className="text-xl flex-shrink-0" style={{ color: 'var(--color-text-muted)' }}>→</div>

        {/* To */}
        <div className="flex-1">
          <p
            className="h-11 px-4 flex items-center text-lg font-bold tabular-nums rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-accent)' }}
          >
            {result.toLocaleString(language === 'pl' ? 'pl-PL' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </p>
          <select
            value={toCur}
            onChange={e => setToCur(e.target.value)}
            className="input mt-1.5 text-xs"
          >
            {SUPPORTED_CURRENCIES.filter(c => c.code !== 'BTC').map(c => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
