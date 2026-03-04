/**
 * Hybrid balance computation:
 * - User enters a snapshot balance and the date it was recorded
 * - Transactions after that date are summed and applied to arrive at an adjusted balance
 *
 * Sign conventions (matching the transactions table):
 *   amount > 0  → money coming in  (income / deposits / payments received)
 *   amount < 0  → money going out  (expenses / charges / payments made)
 *
 * For checking/savings/debit:
 *   adjustedBalance = currentBalance + sum(transactions.amount after balanceAsOfDate)
 *
 * For credit cards:
 *   currentBalance represents what you OWE (positive = debt)
 *   charges (negative amount in DB) increase debt → subtract them (negate)
 *   payments (positive amount in DB) decrease debt → subtract them (also negate, so positive payment reduces debt)
 *   adjustedBalance = currentBalance - sum(transactions.amount after balanceAsOfDate)
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
  // Computed
  adjustedBalance: number | null
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
  /** Sum of transaction amounts strictly after balanceAsOfDate (null if no balance snapshot set) */
  txSumAfterSnapshot: number | null
}

export function computeAccountBalance(row: RawAccountRow): AccountWithBalance {
  let adjustedBalance: number | null = null
  let availableCredit: number | null = null
  let utilization: number | null = null

  if (row.currentBalance !== null) {
    const delta = row.txSumAfterSnapshot ?? 0
    if (CREDIT_TYPES.has(row.type)) {
      // Debt increases with charges (negative amounts), payments reduce it
      adjustedBalance = row.currentBalance - delta
    } else {
      // Asset balance increases with deposits, decreases with withdrawals
      adjustedBalance = row.currentBalance + delta
    }

    if (CREDIT_TYPES.has(row.type) && row.creditLimit !== null && row.creditLimit > 0) {
      availableCredit = row.creditLimit - adjustedBalance
      utilization = adjustedBalance / row.creditLimit
    }
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
    adjustedBalance,
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
    if (account.adjustedBalance === null) continue
    hasAnyBalance = true

    if (CREDIT_TYPES.has(account.type)) {
      totalDebt += account.adjustedBalance
      if (account.creditLimit) totalCreditLimit += account.creditLimit
    } else if (ASSET_TYPES.has(account.type)) {
      totalAssets += account.adjustedBalance
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
