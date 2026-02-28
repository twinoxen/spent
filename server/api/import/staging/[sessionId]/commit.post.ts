import { getDb } from '../../../../db'
import { stagingTransactions, transactions, merchants, importSessions, accounts } from '../../../../db/schema'
import { and, eq } from 'drizzle-orm'
import { generateFingerprint } from '../../../../utils/fingerprint'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const sessionId = Number(event.context.params?.sessionId)

  if (!sessionId || isNaN(sessionId)) {
    throw createError({ statusCode: 400, message: 'Invalid session ID' })
  }

  const [session] = await db
    .select({ id: importSessions.id, accountId: importSessions.accountId, filename: importSessions.filename, status: importSessions.status })
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

  if (session.status === 'committed') {
    throw createError({ statusCode: 409, message: 'This import session has already been committed' })
  }

  const selected = await db
    .select()
    .from(stagingTransactions)
    .where(and(
      eq(stagingTransactions.importSessionId, sessionId),
      eq(stagingTransactions.isSelected, true),
    ))

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of selected) {
    try {
      // Re-check for duplicates against committed transactions at commit time
      const existing = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(eq(transactions.fingerprint, row.fingerprint))
        .limit(1)

      if (existing.length > 0) {
        skipped++
        continue
      }

      // Find or create merchant (scoped to user)
      let merchantId: number | null = null

      if (row.merchantName) {
        const [existingMerchant] = await db
          .select({ id: merchants.id, rawNames: merchants.rawNames })
          .from(merchants)
          .where(and(eq(merchants.normalizedName, row.merchantName), eq(merchants.userId, userId)))
          .limit(1)

        if (existingMerchant) {
          merchantId = existingMerchant.id
          const rawNames = existingMerchant.rawNames as string[]
          if (!rawNames.includes(row.description)) {
            await db
              .update(merchants)
              .set({ rawNames: [...rawNames, row.description] })
              .where(eq(merchants.id, existingMerchant.id))
          }
        } else {
          const [newMerchant] = await db
            .insert(merchants)
            .values({ userId, normalizedName: row.merchantName, rawNames: [row.description] })
            .returning()
          merchantId = newMerchant?.id ?? null
        }
      }

      await db.insert(transactions).values({
        accountId: session.accountId,
        transactionDate: row.transactionDate,
        clearingDate: row.clearingDate ?? undefined,
        description: row.description,
        merchantId,
        categoryId: row.categoryId ?? undefined,
        type: row.type,
        amount: row.amount,
        purchasedBy: row.purchasedBy ?? undefined,
        sourceFile: session.filename,
        fingerprint: row.fingerprint,
        importSessionId: sessionId,
      })

      imported++
    } catch (error) {
      const errorMsg = `Transaction "${row.description}": ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg, error)
    }
  }

  await db
    .update(importSessions)
    .set({ status: 'committed' })
    .where(eq(importSessions.id, sessionId))

  return { success: true, imported, skipped, errors }
})
