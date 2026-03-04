import { sql, type SQL } from 'drizzle-orm'
import { transactions, merchants, accounts } from '../db/schema'

/**
 * Returns a SQL condition that identifies inter-account transfer transactions.
 * Use with `not(...)` to exclude them from stats.
 *
 * Matches two patterns:
 * 1. Positive "Payment" — credit card bill deposits (never real income)
 * 2. Negative "Payment" whose merchant name matches a tracked account —
 *    the expense is already captured as purchases on that account
 */
export function interAccountTransferCondition(userId: number): SQL {
  return sql`(
    (${transactions.type} = 'Payment' AND ${transactions.amount} > 0)
    OR
    (${transactions.type} = 'Payment' AND ${transactions.amount} < 0 AND ${transactions.merchantId} IN (
      SELECT ${merchants.id} FROM ${merchants}
      WHERE ${merchants.normalizedName} IN (
        SELECT ${accounts.name} FROM ${accounts} WHERE ${accounts.userId} = ${userId}
      )
    ))
  )`
}
