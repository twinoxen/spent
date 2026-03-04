import { getDb } from '../../db'
import { accounts } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

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

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const [updated] = await db
    .update(accounts)
    .set(updates)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Account not found' })
  }

  return updated
})
