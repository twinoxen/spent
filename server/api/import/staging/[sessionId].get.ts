import { getDb } from '../../../db'
import { stagingTransactions, importSessions, categories, accounts, transactions } from '../../../db/schema'
import { and, eq, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const sessionId = Number(event.context.params?.sessionId)

  if (!sessionId || isNaN(sessionId)) {
    throw createError({ statusCode: 400, message: 'Invalid session ID' })
  }

  const [session] = await db
    .select({
      id: importSessions.id,
      filename: importSessions.filename,
      status: importSessions.status,
      accountId: importSessions.accountId,
      sourceType: importSessions.sourceType,
      importedAt: importSessions.importedAt,
    })
    .from(importSessions)
    .where(eq(importSessions.id, sessionId))
    .limit(1)

  if (!session) {
    throw createError({ statusCode: 404, message: 'Import session not found' })
  }

  // Verify the session's account belongs to this user
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, session.accountId), eq(accounts.userId, userId)))
    .limit(1)

  if (!account) {
    throw createError({ statusCode: 403, message: 'Access denied' })
  }

  const rows = await db
    .select({
      id: stagingTransactions.id,
      importSessionId: stagingTransactions.importSessionId,
      transactionDate: stagingTransactions.transactionDate,
      clearingDate: stagingTransactions.clearingDate,
      description: stagingTransactions.description,
      merchantName: stagingTransactions.merchantName,
      sourceCategory: stagingTransactions.sourceCategory,
      amount: stagingTransactions.amount,
      type: stagingTransactions.type,
      purchasedBy: stagingTransactions.purchasedBy,
      fingerprint: stagingTransactions.fingerprint,
      categoryId: stagingTransactions.categoryId,
      categoryName: categories.name,
      isDuplicate: stagingTransactions.isDuplicate,
      duplicateOfId: stagingTransactions.duplicateOfId,
      isSelected: stagingTransactions.isSelected,
    })
    .from(stagingTransactions)
    .leftJoin(categories, eq(stagingTransactions.categoryId, categories.id))
    .where(eq(stagingTransactions.importSessionId, sessionId))
    .orderBy(stagingTransactions.transactionDate)

  // Fetch existing transaction details for any duplicates
  const duplicateIds = rows
    .map(r => r.duplicateOfId)
    .filter((id): id is number => id != null)

  const duplicateMap = new Map<number, { id: number; transactionDate: string; description: string; amount: number }>()
  if (duplicateIds.length > 0) {
    const existingTxs = await db
      .select({
        id: transactions.id,
        transactionDate: transactions.transactionDate,
        description: transactions.description,
        amount: transactions.amount,
      })
      .from(transactions)
      .where(inArray(transactions.id, duplicateIds))

    for (const tx of existingTxs) {
      duplicateMap.set(tx.id, tx)
    }
  }

  const enrichedRows = rows.map(row => ({
    ...row,
    duplicateOf: row.duplicateOfId != null ? (duplicateMap.get(row.duplicateOfId) ?? null) : null,
  }))

  const allCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.name)

  return {
    session,
    transactions: enrichedRows,
    categories: allCategories,
  }
})
