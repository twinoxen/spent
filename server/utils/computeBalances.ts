/**
 * Balance model
 *
 * Transactions use signed amounts:
 *   amount > 0  → money in (income / deposits / credit card payments)
 *   amount < 0  → money out (expenses / charges)
 *
 * Calculated balance is derived from ALL transactions and updates immediately.
 *
 * For checking/savings/debit/investment/other:
 *   calculatedBalance = sum(transactions.amount)
 *
 * For credit cards (balance means debt owed):
 *   calculatedBalance = -sum(transactions.amount)
 *
 * Optional reconciliation snapshot:
 *   currentBalance + balanceAsOfDate are user-entered bank snapshots.
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
  totalTxAmount: number | null
  openingTxAmount: number | null
  openingTxDate: string | null
}

export function computeAccountBalance(row: RawAccountRow): AccountWithBalance {
  let calculatedBalance: number | null = null
  let delta: number | null = null
  let availableCredit: number | null = null
  let utilization: number | null = null

  if (row.transactionCount > 0) {
    const txSum = row.totalTxAmount ?? 0
    calculatedBalance = CREDIT_TYPES.has(row.type) ? -txSum : txSum
  }

  if (calculatedBalance !== null && row.currentBalance !== null) {
    delta = calculatedBalance - row.currentBalance
  }

  if (CREDIT_TYPES.has(row.type) && calculatedBalance !== null && row.creditLimit !== null && row.creditLimit > 0) {
    availableCredit = row.creditLimit - calculatedBalance
    utilization = calculatedBalance / row.creditLimit
  }

  const openingBalance = row.openingTxAmount === null
    ? null
    : CREDIT_TYPES.has(row.type) ? -row.openingTxAmount : row.openingTxAmount

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
