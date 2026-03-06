import { getDb } from '../../db'
import { accounts, transactions } from '../../db/schema'
import { and, eq } from 'drizzle-orm'
import { getAccountType, upsertOpeningBalanceTransaction } from '../../utils/openingBalance'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = parseInt(getRouterParam(event, 'id')!)
  const body = await readBody(event)

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.type !== undefined) updates.type = body.type
  if (body.institution !== undefined) updates.institution = body.institution?.trim() || null
  if (body.lastFour !== undefined) updates.lastFour = body.lastFour?.trim() || null
  if (body.color !== undefined) updates.color = body.color
  if (body.currentBalance !== undefined) updates.currentBalance = body.currentBalance != null ? Number(body.currentBalance) : null
  if (body.balanceAsOfDate !== undefined) updates.balanceAsOfDate = body.balanceAsOfDate?.trim() || null
  if (body.creditLimit !== undefined) updates.creditLimit = body.creditLimit != null ? Number(body.creditLimit) : null
  if (body.apr !== undefined) updates.apr = body.apr != null ? Number(body.apr) : null

  const hasOpeningMutation = body.openingBalance !== undefined || body.openingBalanceDate !== undefined
  if (Object.keys(updates).length === 0 && !hasOpeningMutation) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  let updated
  if (Object.keys(updates).length > 0) {
    ;[updated] = await db
      .update(accounts)
      .set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, message: 'Account not found' })
    }
  } else {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .limit(1)

    if (!account) {
      throw createError({ statusCode: 404, message: 'Account not found' })
    }
    updated = account
  }

  if (hasOpeningMutation) {
    const accountType = (body.type as string | undefined) ?? await getAccountType(db, id, userId)
    if (!accountType) {
      throw createError({ statusCode: 404, message: 'Account not found' })
    }

    if (body.openingBalance !== undefined) {
      const openingBalance = body.openingBalance != null ? Number(body.openingBalance) : null
      await upsertOpeningBalanceTransaction(db, {
        accountId: id,
        accountType,
        openingBalance,
        openingBalanceDate: body.openingBalanceDate !== undefined ? (body.openingBalanceDate?.trim() || null) : null,
      })
    } else if (body.openingBalanceDate !== undefined) {
      const [openingTx] = await db
        .select({ amount: transactions.amount })
        .from(transactions)
        .where(and(eq(transactions.accountId, id), eq(transactions.isOpeningBalance, true)))
        .limit(1)

      if (openingTx) {
        const openingBalance = accountType === 'credit_card' ? -openingTx.amount : openingTx.amount
        await upsertOpeningBalanceTransaction(db, {
          accountId: id,
          accountType,
          openingBalance,
          openingBalanceDate: body.openingBalanceDate?.trim() || null,
        })
      }
    }
  }

  return updated
})
