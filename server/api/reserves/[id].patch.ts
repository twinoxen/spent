import { getDb } from '../../db'
import { reserves } from '../../db/schema'
import { and, eq } from 'drizzle-orm'
import {
  RESERVE_CONTRIBUTION_CADENCES,
  RESERVE_PAYMENT_CADENCES,
  RESERVE_STATUSES,
  enrichReserveRow,
  isValidDateString,
  roundMoney,
  validateReserveCadence,
  validateReservePaymentCadence,
  validateReserveStatus,
  verifyAccountBelongsToUser,
} from '../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const id = Number(getRouterParam(event, 'id'))

  if (!id || Number.isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid reserve ID' })
  }

  const body = await readBody(event)
  const updates: Partial<typeof reserves.$inferInsert> = {}

  if (body.accountId !== undefined) {
    const accountId = Number(body.accountId)
    if (!accountId || Number.isNaN(accountId)) {
      throw createError({ statusCode: 400, message: 'accountId must be a number' })
    }
    const account = await verifyAccountBelongsToUser(db, accountId, userId)
    if (!account) throw createError({ statusCode: 400, message: 'Account not found' })
    updates.accountId = accountId
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      throw createError({ statusCode: 400, message: 'name must be a non-empty string' })
    }
    updates.name = body.name.trim()
  }

  if (body.targetAmount !== undefined) {
    if (typeof body.targetAmount !== 'number' || body.targetAmount <= 0) {
      throw createError({ statusCode: 400, message: 'targetAmount must be a positive number' })
    }
    updates.targetAmount = roundMoney(body.targetAmount)
  }

  if (body.currentReservedAmount !== undefined) {
    if (typeof body.currentReservedAmount !== 'number' || body.currentReservedAmount < 0) {
      throw createError({ statusCode: 400, message: 'currentReservedAmount must be zero or greater' })
    }
    updates.currentReservedAmount = roundMoney(body.currentReservedAmount)
  }

  if (body.contributionAmount !== undefined) {
    if (typeof body.contributionAmount !== 'number' || body.contributionAmount < 0) {
      throw createError({ statusCode: 400, message: 'contributionAmount must be zero or greater' })
    }
    updates.contributionAmount = roundMoney(body.contributionAmount)
  }

  if (body.contributionCadence !== undefined) {
    if (!validateReserveCadence(body.contributionCadence)) {
      throw createError({
        statusCode: 400,
        message: `contributionCadence must be one of: ${RESERVE_CONTRIBUTION_CADENCES.join(', ')}`,
      })
    }
    updates.contributionCadence = body.contributionCadence
  }

  if (body.actualPaymentCadence !== undefined) {
    if (!validateReservePaymentCadence(body.actualPaymentCadence)) {
      throw createError({
        statusCode: 400,
        message: `actualPaymentCadence must be one of: ${RESERVE_PAYMENT_CADENCES.join(', ')}`,
      })
    }
    updates.actualPaymentCadence = body.actualPaymentCadence
  }

  if (body.nextDueDate !== undefined) {
    if (!isValidDateString(body.nextDueDate)) {
      throw createError({ statusCode: 400, message: 'nextDueDate must be YYYY-MM-DD' })
    }
    updates.nextDueDate = body.nextDueDate
  }

  if (body.category !== undefined) updates.category = body.category?.trim() || null

  if (body.status !== undefined) {
    if (!validateReserveStatus(body.status)) {
      throw createError({
        statusCode: 400,
        message: `status must be one of: ${RESERVE_STATUSES.join(', ')}`,
      })
    }
    updates.status = body.status
  }

  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null
  if (body.lastAccruedDate !== undefined) {
    if (body.lastAccruedDate !== null && !isValidDateString(body.lastAccruedDate)) {
      throw createError({ statusCode: 400, message: 'lastAccruedDate must be YYYY-MM-DD or null' })
    }
    updates.lastAccruedDate = body.lastAccruedDate
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const [updated] = await db
    .update(reserves)
    .set(updates)
    .where(and(eq(reserves.id, id), eq(reserves.userId, userId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Reserve not found' })
  }

  return enrichReserveRow(updated)
})
