import { getDb } from '../../db'
import { accounts } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = getDb()
  const userId = event.context.user.id
  const body = await readBody(event)

  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, message: 'Account name is required' })
  }

  const [account] = await db.insert(accounts).values({
    userId,
    name: body.name.trim(),
    type: body.type || 'credit_card',
    institution: body.institution?.trim() || null,
    lastFour: body.lastFour?.trim() || null,
    color: body.color || '#6366f1',
  }).returning()

  return account
})
