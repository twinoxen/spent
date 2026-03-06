import { formatMoney } from './formatMoney'

/** Full currency format in accounting style, e.g. ($12,034.54) */
export function formatCurrency(amount: number): string {
  return formatMoney(amount)
}

/** Compact format for tight spaces: $12.0k or $234 */
export function formatCurrencyCompact(amount: number): string {
  const abs = Math.abs(amount)
  const compact = abs >= 1000 ? '$' + (abs / 1000).toFixed(1) + 'k' : '$' + Math.round(abs)
  return amount < 0 ? `(${compact})` : compact
}
