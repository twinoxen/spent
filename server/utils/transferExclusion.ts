import { sql, type SQL } from 'drizzle-orm'
import { transactions, merchants, accounts } from '../db/schema'

/**
 * Returns a SQL condition that identifies inter-account transfer transactions.
 * Use with `not(...)` to exclude them from stats.
 *
 * Matches three patterns:
 * 1. Any "Transfer" type — always an inter-account move (savings, investments, etc.)
 * 2. Positive "Payment" — incoming credit card payment credits (never real income)
 * 3. Negative "Payment" whose merchant matches a tracked account, by either:
 *    - account name (e.g. "Apple Card")
 *    - account institution (e.g. "Bank of America"), case-insensitive
 *    This avoids relying on an exact account-name match, which breaks if the
 *    account is renamed or the institution name differs slightly.
 */
export function interAccountTransferCondition(userId: number): SQL {
  return sql`(
    ${transactions.type} = 'Transfer'
    OR
    (${transactions.type} = 'Payment' AND ${transactions.amount} > 0)
    OR
    (${transactions.type} = 'Payment' AND ${transactions.amount} < 0 AND ${transactions.merchantId} IN (
      SELECT ${merchants.id} FROM ${merchants}
      WHERE LOWER(${merchants.normalizedName}) IN (
        SELECT LOWER(${accounts.name}) FROM ${accounts}
        WHERE ${accounts.userId} = ${userId}
        UNION
        SELECT LOWER(${accounts.institution}) FROM ${accounts}
        WHERE ${accounts.userId} = ${userId} AND ${accounts.institution} IS NOT NULL
      )
    ))
  )`
}
