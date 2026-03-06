export interface FormatMoneyOptions {
  locale?: string
  currency?: string
}

/**
 * Accounting-style currency formatting.
 * Negative numbers render in parentheses, e.g. ($1,234.56).
 */
export function formatMoney(
  amount: number,
  config: FormatMoneyOptions = {},
): string {
  const { locale = 'en-US', currency = 'USD' } = config

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (amount < 0) {
    return `(${formatter.format(Math.abs(amount))})`
  }

  return formatter.format(amount)
}

export function moneyValueToneClass(amount: number): string {
  return amount < 0
    ? 'text-red-600 dark:text-red-400'
    : 'text-emerald-600 dark:text-emerald-400'
}
