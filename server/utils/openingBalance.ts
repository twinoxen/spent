import { and, eq } from 'drizzle-orm'
import { accounts, transactions } from '../db/schema'
import { generateFingerprint } from './fingerprint'

function toStoredOpeningAmount(_accountType: string, openingBalance: number): number {
  // Opening-balance anchors are stored as positive values for all account types.
  return Math.abs(openingBalance)
}

export async function upsertOpeningBalanceTransaction(
  db: any,
  params: {
    accountId: number
    accountType: string
    openingBalance: number | null
    openingBalanceDate: string | null
  },
) {
  const { accountId, accountType, openingBalance, openingBalanceDate } = params

  const [existingOpening] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.isOpeningBalance, true)))
    .limit(1)

  if (openingBalance === null) {
    if (existingOpening) {
      await db.delete(transactions).where(eq(transactions.id, existingOpening.id))
    }
    return
  }

  const transactionDate = openingBalanceDate ?? new Date().toISOString().slice(0, 10)
  const amount = toStoredOpeningAmount(accountType, Number(openingBalance))
  const fingerprint = generateFingerprint(transactionDate, 'Opening Balance', amount, `account:${accountId}`)

  if (existingOpening) {
    await db.update(transactions)
      .set({
        transactionDate,
        description: 'Opening Balance',
        type: 'Opening Balance',
        amount,
        isOpeningBalance: true,
        fingerprint,
        sourceFile: 'system',
      })
      .where(eq(transactions.id, existingOpening.id))
  } else {
    await db.insert(transactions).values({
      accountId,
      transactionDate,
      description: 'Opening Balance',
      type: 'Opening Balance',
      amount,
      isOpeningBalance: true,
      fingerprint,
      sourceFile: 'system',
    })
  }
}

export async function getAccountType(db: any, accountId: number, userId: number): Promise<string | null> {
  const [account] = await db
    .select({ type: accounts.type })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1)

  return account?.type ?? null
}
