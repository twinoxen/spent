import { getDb } from '../../db'
import {
  createReserve,
  isValidDateString,
  RESERVE_CONTRIBUTION_CADENCES,
  RESERVE_PAYMENT_CADENCES,
  RESERVE_STATUSES,
  validateReserveCadence,
  validateReservePaymentCadence,
  validateReserveStatus,
} from '../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const body = await readBody(event)

  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    throw createError({ statusCode: 400, message: 'name must be a non-empty string' })
  }
  if (typeof body.accountId !== 'number') {
    throw createError({ statusCode: 400, message: 'accountId is required' })
  }
  if (typeof body.targetAmount !== 'number' || body.targetAmount <= 0) {
    throw createError({ statusCode: 400, message: 'targetAmount must be a positive number' })
  }
  if (body.currentReservedAmount !== undefined && (typeof body.currentReservedAmount !== 'number' || body.currentReservedAmount < 0)) {
    throw createError({ statusCode: 400, message: 'currentReservedAmount must be zero or greater' })
  }
  if (body.contributionAmount !== undefined && (typeof body.contributionAmount !== 'number' || body.contributionAmount < 0)) {
    throw createError({ statusCode: 400, message: 'contributionAmount must be zero or greater' })
  }
  if (body.contributionCadence !== undefined && !validateReserveCadence(body.contributionCadence)) {
    throw createError({ statusCode: 400, message: `contributionCadence must be one of: ${RESERVE_CONTRIBUTION_CADENCES.join(', ')}` })
  }
  if (body.actualPaymentCadence !== undefined && !validateReservePaymentCadence(body.actualPaymentCadence)) {
    throw createError({ statusCode: 400, message: `actualPaymentCadence must be one of: ${RESERVE_PAYMENT_CADENCES.join(', ')}` })
  }
  if (!isValidDateString(body.nextDueDate)) {
    throw createError({ statusCode: 400, message: 'nextDueDate must be YYYY-MM-DD' })
  }
  if (body.status !== undefined && !validateReserveStatus(body.status)) {
    throw createError({ statusCode: 400, message: `status must be one of: ${RESERVE_STATUSES.join(', ')}` })
  }

  return createReserve(db, userId, {
    accountId: body.accountId,
    name: body.name,
    targetAmount: body.targetAmount,
    currentReservedAmount: body.currentReservedAmount,
    contributionAmount: body.contributionAmount,
    contributionCadence: body.contributionCadence,
    actualPaymentCadence: body.actualPaymentCadence,
    nextDueDate: body.nextDueDate,
    category: body.category ?? null,
    status: body.status,
    notes: body.notes ?? null,
    lastAccruedDate: body.lastAccruedDate ?? null,
    openingMovementDate: body.openingMovementDate,
  })
})
