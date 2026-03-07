/**
 * Balance model
 *
 * Transactions use signed amounts:
 *   amount > 0  → inflow (income / deposits / credit card payments / refunds)
 *   amount < 0  → outflow (expenses / charges)
 *
 * Invariant:
 *   - checking/savings/debit balances represent cash available
 *   - credit card balances represent debt owed (positive means you owe money)
 *   - opening balance anchors are stored as positive values for all account types
 *
 * Calculated balance includes both posted and pending transactions.
 *
 * Semantics:
 *   - assets (checking/savings/debit): calculated = opening + cashflow
 *   - credit cards (debt):          calculated = openingDebt - cashflow
 *
 * Optional reconciliation snapshot:
 *   currentBalance + balanceAsOfDate are user-entered snapshots.
 *   delta = calculatedBalance - currentBalance (only when snapshot exists)
 */

const CREDIT_TYPES = new Set(['credit_card'])
const ASSET_TYPES = new Set(['checking', 'savings', 'debit'])

export interface AccountWithBalance {
  id: number
  name: string
  type: string
  institution: string | null
  lastFour: string | null
  color: string | null
  currentBalance: number | null
  balanceAsOfDate: string | null
  creditLimit: number | null
  apr: number | null
  createdAt: Date | null
  transactionCount: number
  openingBalance: number | null
  openingBalanceDate: string | null
  // Computed
  calculatedBalance: number | null
  pendingTotal: number
  delta: number | null
  availableCredit: number | null
  utilization: number | null
}

export interface RawAccountRow {
  id: number
  name: string
  type: string
  institution: string | null
  lastFour: string | null
  color: string | null
  currentBalance: number | null
  balanceAsOfDate: string | null
  creditLimit: number | null
  apr: number | null
  createdAt: Date | null
  transactionCount: number
  totalTxAmount: number | null // backward compatibility
  postedTxAmount?: number | null
  pendingTxAmount?: number | null
  anchoredTxAmount?: number | null
  openingTxAmount: number | null
  openingTxDate: string | null
}

export function computeAccountBalance(row: RawAccountRow): AccountWithBalance {
  let calculatedBalance: number | null = null
  let delta: number | null = null
  let availableCredit: number | null = null
  let utilization: number | null = null

  const isCreditCard = CREDIT_TYPES.has(row.type)
  const openingBalance = row.openingTxAmount === null ? null : row.openingTxAmount
  const pendingTotal = row.pendingTxAmount ?? 0

  if (row.transactionCount > 0) {
    if (row.anchoredTxAmount !== undefined) {
      // anchoredTxAmount currently contains:
      //   opening + sum(non-opening tx after anchor cutoff) when opening exists
      //   sum(all tx) when opening is absent
      const anchoredAggregate = row.anchoredTxAmount ?? 0

      if (isCreditCard) {
        calculatedBalance = openingBalance === null
          ? -anchoredAggregate
          : (2 * openingBalance) - anchoredAggregate
      } else {
        calculatedBalance = anchoredAggregate
      }
    } else {
      const posted = row.postedTxAmount
      const pending = row.pendingTxAmount
      const txSum = (posted === undefined && pending === undefined)
        ? (row.totalTxAmount ?? 0)
        : (posted ?? 0) + (pending ?? 0)

      if (isCreditCard) {
        calculatedBalance = openingBalance === null
          ? -txSum
          : (2 * openingBalance) - txSum
      } else {
        calculatedBalance = txSum
      }
    }
  }

  if (calculatedBalance !== null && row.currentBalance !== null) {
    delta = calculatedBalance - row.currentBalance
  }

  if (isCreditCard && calculatedBalance !== null && row.creditLimit !== null && row.creditLimit > 0) {
    availableCredit = row.creditLimit - calculatedBalance
    utilization = calculatedBalance / row.creditLimit
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution,
    lastFour: row.lastFour,
    color: row.color,
    currentBalance: row.currentBalance,
    balanceAsOfDate: row.balanceAsOfDate,
    creditLimit: row.creditLimit,
    apr: row.apr,
    createdAt: row.createdAt,
    transactionCount: row.transactionCount,
    openingBalance,
    openingBalanceDate: row.openingTxDate,
    calculatedBalance,
    pendingTotal,
    delta,
    availableCredit,
    utilization,
  }
}

export function computeFinancialSummary(accounts: AccountWithBalance[]) {
  let totalAssets = 0
  let totalDebt = 0
  let totalCreditLimit = 0
  let hasAnyBalance = false

  for (const account of accounts) {
    if (account.calculatedBalance === null) continue
    hasAnyBalance = true

    if (CREDIT_TYPES.has(account.type)) {
      totalDebt += account.calculatedBalance
      if (account.creditLimit) totalCreditLimit += account.creditLimit
    } else if (ASSET_TYPES.has(account.type)) {
      totalAssets += account.calculatedBalance
    }
  }

  const netPosition = totalAssets - totalDebt
  const overallUtilization = totalCreditLimit > 0 ? totalDebt / totalCreditLimit : null

  return {
    hasAnyBalance,
    totalAssets,
    totalDebt,
    totalCreditLimit,
    netPosition,
    overallUtilization,
  }
}
