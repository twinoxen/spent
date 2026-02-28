import { getDb } from '../db'
import { transactions, stagingTransactions, importSessions, categories, accounts } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import { generateFingerprint } from '../utils/fingerprint'
import { autoCategorizeMerchant } from '../utils/categorizer'
import { detectStrategy } from '../utils/import-strategies'
import { parsePdfStatement } from '../utils/import-strategies/pdf'
import type { NormalizedTransaction } from '../utils/import-strategies/types'
import { createCategorizerStrategy, type CategorizationInput } from '../utils/llmCategorizer'

interface ImportResult {
  success: boolean
  stagingSessionId: number
  stagedCount: number
  duplicateCount: number
  errors: string[]
}

export default defineEventHandler(async (event): Promise<ImportResult> => {
  const db = getDb()
  const userId = event.context.user.id
  const config = useRuntimeConfig()

  try {
    const formData = await readMultipartFormData(event)

    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, message: 'No file uploaded' })
    }

    const fileData = formData.find(item => item.name === 'file')
    const accountIdData = formData.find(item => item.name === 'accountId')

    if (!fileData?.data) {
      throw createError({ statusCode: 400, message: 'Invalid file data' })
    }

    if (!accountIdData?.data) {
      throw createError({ statusCode: 400, message: 'accountId is required' })
    }

    const accountId = parseInt(accountIdData.data.toString('utf-8'))
    if (isNaN(accountId)) {
      throw createError({ statusCode: 400, message: 'Invalid accountId' })
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (fileData.data.length > MAX_FILE_SIZE) {
      throw createError({ statusCode: 400, message: 'File size exceeds the 10 MB limit.' })
    }

    // Verify account exists and belongs to this user
    const [account] = await db
      .select({ id: accounts.id, institution: accounts.institution })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
      .limit(1)

    if (!account) {
      throw createError({ statusCode: 400, message: 'Account not found' })
    }

    const filename = fileData.filename || 'unknown'

    let records: NormalizedTransaction[]
    let sourceType: string
    if (filename.toLowerCase().endsWith('.pdf')) {
      records = await parsePdfStatement(
        fileData.data,
        config.openaiApiKey,
        account.institution ?? undefined,
      )
      sourceType = 'pdf'
    } else {
      const csvContent = fileData.data.toString('utf-8')
      const strategy = detectStrategy(filename, csvContent)
      records = strategy.parse(csvContent)
      sourceType = strategy.name
    }

    const allCategories = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.userId, userId))

    const llmStrategy = createCategorizerStrategy({ openaiApiKey: config.openaiApiKey })
    const llmCache = new Map<string, number | null>()

    const llmFallback = async (merchantName: string, record: typeof records[number]): Promise<number | null> => {
      if (!llmStrategy) return null
      if (llmCache.has(merchantName)) return llmCache.get(merchantName) ?? null

      const input: CategorizationInput = {
        merchantName,
        description: record.description,
        amount: record.amount,
        type: record.type,
        sourceCategory: record.sourceCategory,
        categories: allCategories,
      }

      const result = await llmStrategy.categorize(input)
      llmCache.set(merchantName, result)
      return result
    }

    const insertedSessions = await db.insert(importSessions).values({
      accountId,
      filename,
      rowCount: records.length,
      sourceType,
      status: 'pending_review',
    }).returning()
    const session = insertedSessions[0]!


    let stagedCount = 0
    let duplicateCount = 0
    const errors: string[] = []

    for (const [i, record] of records.entries()) {
      try {
        const fingerprint = generateFingerprint(
          record.transactionDate,
          record.description,
          record.amount,
          record.purchasedBy ?? ''
        )

        const existing = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(eq(transactions.fingerprint, fingerprint))
          .limit(1)

        const isDuplicate = existing.length > 0

        if (isDuplicate) {
          duplicateCount++
        }

        const categoryId = await autoCategorizeMerchant(
          record.merchantName,
          record.description,
          record.sourceCategory,
          (merchantName) => llmFallback(merchantName, record),
          userId
        )

        await db.insert(stagingTransactions).values({
          importSessionId: session!.id,
          transactionDate: record.transactionDate,
          clearingDate: record.clearingDate,
          description: record.description,
          merchantName: record.merchantName ?? '',
          sourceCategory: record.sourceCategory,
          amount: record.amount,
          type: record.type,
          purchasedBy: record.purchasedBy,
          fingerprint,
          categoryId,
          isDuplicate,
          isSelected: !isDuplicate,
        })

        stagedCount++
      } catch (error) {
        const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg, error)
      }
    }

    return {
      success: true,
      stagingSessionId: session.id,
      stagedCount,
      duplicateCount,
      errors,
    }
  } catch (error) {
    console.error('Import error:', error)
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Import failed',
    })
  }
})
