import { getDb } from '../../db'
import { transactions, merchants, accounts, categories } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { generateFingerprint } from '../../utils/fingerprint'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const body = await readBody(event)

  const {
    accountId,
    transactionDate, // expects YYYY-MM-DD from client
    description,
    type,
    amount,
    categoryId,
    merchantName,
    purchasedBy,
    notes,
  } = body

  if (!accountId || !transactionDate || !description || !type || amount == null) {
    throw createError({ statusCode: 400, message: 'accountId, transactionDate, description, type, and amount are required' })
  }

  // Verify account exists
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, Number(accountId)))
    .limit(1)

  if (!account) {
    throw createError({ statusCode: 400, message: 'Account not found' })
  }

  // Validate category if provided
  if (categoryId) {
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, Number(categoryId)))
      .limit(1)

    if (!cat) {
      throw createError({ statusCode: 400, message: 'Category not found' })
    }
  }

  // Convert YYYY-MM-DD → MM/DD/YYYY for storage
  const [y, m, d] = String(transactionDate).split('-')
  const storedDate = `${m}/${d}/${y}`

  const fingerprint = generateFingerprint(storedDate, description, Number(amount), purchasedBy ?? '')

  // Check for duplicate fingerprint
  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.fingerprint, fingerprint))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, message: 'A transaction with identical details already exists' })
  }

  // Find or create merchant
  let resolvedMerchantId: number | null = null
  const trimmedMerchantName = merchantName?.trim()

  if (trimmedMerchantName) {
    const [existingMerchant] = await db
      .select({ id: merchants.id, rawNames: merchants.rawNames })
      .from(merchants)
      .where(eq(merchants.normalizedName, trimmedMerchantName))
      .limit(1)

    if (existingMerchant) {
      resolvedMerchantId = existingMerchant.id
      const rawNames = existingMerchant.rawNames as string[]
      if (!rawNames.includes(description)) {
        await db
          .update(merchants)
          .set({ rawNames: [...rawNames, description] })
          .where(eq(merchants.id, existingMerchant.id))
      }
    } else {
      const [newMerchant] = await db.insert(merchants).values({
        normalizedName: trimmedMerchantName,
        rawNames: [description],
      }).returning()
      resolvedMerchantId = newMerchant.id
    }
  }

  const [created] = await db.insert(transactions).values({
    accountId: Number(accountId),
    transactionDate: storedDate,
    description: String(description),
    type: String(type),
    amount: Number(amount),
    merchantId: resolvedMerchantId,
    categoryId: categoryId ? Number(categoryId) : null,
    purchasedBy: purchasedBy?.trim() || null,
    notes: notes?.trim() || null,
    fingerprint,
    sourceFile: 'manual',
  }).returning()

  return { transaction: created }
})
