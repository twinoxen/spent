import { getDb } from '../../db'
import { accounts } from '../../db/schema'
import { upsertOpeningBalanceTransaction } from '../../utils/openingBalance'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody(event)

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, message: 'Account name is required' })
  }

  const type = body.type || 'credit_card'
  const isCreditCard = type === 'credit_card'

  const [account] = await db.insert(accounts).values({
    userId,
    name: body.name.trim(),
    type,
    institution: body.institution?.trim() || null,
    lastFour: body.lastFour?.trim() || null,
    color: body.color || '#6366f1',
    currentBalance: body.currentBalance != null ? Number(body.currentBalance) : null,
    balanceAsOfDate: body.balanceAsOfDate?.trim() || null,
    creditLimit: isCreditCard && body.creditLimit != null ? Number(body.creditLimit) : null,
    apr: isCreditCard && body.apr != null ? Number(body.apr) : null,
  }).returning()

  const openingBalance = body.openingBalance != null ? Number(body.openingBalance) : null
  if (openingBalance !== null) {
    await upsertOpeningBalanceTransaction(db, {
      accountId: account.id,
      accountType: type,
      openingBalance,
      openingBalanceDate: body.openingBalanceDate?.trim() || null,
    })
  }

  return account
})
