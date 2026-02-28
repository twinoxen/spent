import { getDb } from '../../../db'
import { stagingTransactions, importSessions, categories, accounts } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = getDb()
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
      isSelected: stagingTransactions.isSelected,
    })
    .from(stagingTransactions)
    .leftJoin(categories, eq(stagingTransactions.categoryId, categories.id))
    .where(eq(stagingTransactions.importSessionId, sessionId))
    .orderBy(stagingTransactions.transactionDate)

  const allCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(categories.name)

  return {
    session,
    transactions: rows,
    categories: allCategories,
  }
})
