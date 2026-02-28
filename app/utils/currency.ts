const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Full currency format: $12,034.54 */
export function formatCurrency(amount: number): string {
  return USD.format(amount)
}

/** Compact format for tight spaces: $12.0k or $234 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000) return '$' + (amount / 1000).toFixed(1) + 'k'
  return '$' + Math.round(amount)
}
