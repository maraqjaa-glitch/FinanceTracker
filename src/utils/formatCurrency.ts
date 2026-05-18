// ─────────────────────────────────────────────
// Currency formatting — locale-aware
// PL: 10 411,87 PLN   EN: PLN 10,411.87
// ─────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  currency = 'PLN',
  language = 'pl'
): string {
  const locale = language === 'pl' ? 'pl-PL' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback for unknown currency codes
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' ' + currency
  }
}

/** Format a plain number with thousands separators, no currency symbol */
export function formatNumber(amount: number, language = 'pl'): string {
  const locale = language === 'pl' ? 'pl-PL' : 'en-US'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Sign-prefixed amount, e.g. +1 000,00 or -500,00 */
export function formatAmountSigned(
  amount: number,
  currency = 'PLN',
  language = 'pl'
): string {
  const formatted = formatCurrency(Math.abs(amount), currency, language)
  return amount >= 0 ? `+${formatted}` : `-${formatted}`
}
