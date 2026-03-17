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
 * Semantics — two modes depending on whether a reconciliation snapshot exists:
 *
 *   Snapshot anchor (preferred when currentBalance + balanceAsOfDate are set):
 *     calculatedBalance = snapshot + cashflow_since_snapshot   (assets)
 *     calculatedBalance = snapshot - cashflow_since_snapshot   (credit cards)
 *     delta = calculatedBalance - snapshot = ±cashflow_since_snapshot
 *     Pending transactions on the snapshot date are included in cashflow_since_snapshot
 *     because the user-entered snapshot typically reflects only posted activity.
 *
 *   Opening balance anchor (fallback when no snapshot):
 *     calculatedBalance = openingBalance + cashflow_since_opening  (assets)
 *     calculatedBalance = openingDebt    - cashflow_since_opening  (credit cards)
 *     delta = calculatedBalance - currentBalance (only when snapshot exists)
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
  // Sum of tx after (or pending on) the snapshot date; null when no snapshot exists.
  snapshotTxAmount?: number | null
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

  // Snapshot-anchor mode: when the user has entered a reconciliation snapshot
  // (currentBalance + balanceAsOfDate), use it as the ground-truth anchor.
  // calculatedBalance = snapshot ± cashflow_since_snapshot, so the delta
  // equals exactly the net transaction movement since the last reconciliation.
  if (row.snapshotTxAmount !== null && row.snapshotTxAmount !== undefined && row.currentBalance !== null) {
    const snapshotFlow = row.snapshotTxAmount
    calculatedBalance = isCreditCard
      ? row.currentBalance - snapshotFlow
      : row.currentBalance + snapshotFlow
  } else if (row.transactionCount > 0) {
    // Opening-balance anchor fallback (no snapshot available).
    if (row.anchoredTxAmount !== undefined) {
      // anchoredTxAmount contains:
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
