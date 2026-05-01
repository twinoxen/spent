import { getDb } from '../../../db'
import { accounts, transactions } from '../../../db/schema'
import { and, eq } from 'drizzle-orm'
import { addReserveMovement, getReserveForUser, roundMoney } from '../../../utils/reserves'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const userId = event.context.user.id
  const reserveId = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (!reserveId || Number.isNaN(reserveId)) {
    throw createError({ statusCode: 400, message: 'Invalid reserve ID' })
  }

  if (typeof body.transactionId !== 'number' || body.transactionId <= 0) {
    throw createError({ statusCode: 400, message: 'transactionId must be a positive number' })
  }

  if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0)) {
    throw createError({ statusCode: 400, message: 'amount must be a positive number' })
  }

  const reserve = await getReserveForUser(db, reserveId, userId)
  if (!reserve) {
    throw createError({ statusCode: 404, message: 'Reserve not found' })
  }

  const [tx] = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      transactionDate: transactions.transactionDate,
      amount: transactions.amount,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(
      eq(transactions.id, body.transactionId),
      eq(accounts.userId, userId),
      eq(transactions.accountId, reserve.accountId),
    ))
    .limit(1)

  if (!tx) {
    throw createError({ statusCode: 400, message: 'Transaction must belong to the same reserved account' })
  }

  const amount = roundMoney(body.amount ?? Math.min(Math.abs(Number(tx.amount)), Number(reserve.currentReservedAmount)))
  if (amount <= 0) {
    throw createError({ statusCode: 400, message: 'Release amount must be positive' })
  }

  const date = typeof body.date === 'string' && body.date.trim()
    ? body.date.trim()
    : tx.transactionDate

  return addReserveMovement(db, userId, {
    reserveId,
    date,
    amount,
    type: 'release',
    linkedTransactionId: body.transactionId,
    notes: body.notes ?? 'Released reserve for linked payment',
  })
})
