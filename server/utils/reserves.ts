import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { accounts, bills, reserveMovements, reserves, transactions } from '../db/schema'
import { listAccountsWithBalances } from './listAccountsBalances'

export const RESERVE_CONTRIBUTION_CADENCES = ['monthly', 'biweekly', 'weekly', 'custom'] as const
export const RESERVE_PAYMENT_CADENCES = ['monthly', 'quarterly', 'annual', 'custom'] as const
export const RESERVE_STATUSES = ['active', 'paused', 'completed'] as const
export const RESERVE_MOVEMENT_TYPES = ['contribution', 'release', 'adjustment'] as const

export type ReserveContributionCadence = typeof RESERVE_CONTRIBUTION_CADENCES[number]
export type ReservePaymentCadence = typeof RESERVE_PAYMENT_CADENCES[number]
export type ReserveStatus = typeof RESERVE_STATUSES[number]
export type ReserveMovementType = typeof RESERVE_MOVEMENT_TYPES[number]

export interface ReserveSummaryRow {
  id: number
  userId: number
  accountId: number
  accountName: string | null
  accountColor: string | null
  name: string
  targetAmount: number
  currentReservedAmount: number
  contributionAmount: number
  contributionCadence: ReserveContributionCadence
  actualPaymentCadence: ReservePaymentCadence
  nextDueDate: string
  category: string | null
  status: ReserveStatus
  notes: string | null
  lastAccruedDate: string | null
  createdAt: Date | null
  progress: number | null
  shortfall: number
  surplus: number
}

export interface CreateReserveInput {
  accountId: number
  name: string
  targetAmount: number
  currentReservedAmount?: number
  contributionAmount?: number
  contributionCadence?: ReserveContributionCadence
  actualPaymentCadence?: ReservePaymentCadence
  nextDueDate: string
  category?: string | null
  status?: ReserveStatus
  notes?: string | null
  lastAccruedDate?: string | null
  openingMovementDate?: string
}

export interface ReserveMovementInput {
  reserveId: number
  date: string
  amount: number
  type: ReserveMovementType
  linkedTransactionId?: number | null
  notes?: string | null
}

export interface UpdateReserveInput {
  accountId?: number
  name?: string
  targetAmount?: number
  currentReservedAmount?: number
  contributionAmount?: number
  contributionCadence?: ReserveContributionCadence
  actualPaymentCadence?: ReservePaymentCadence
  nextDueDate?: string
  category?: string | null
  status?: ReserveStatus
  notes?: string | null
  lastAccruedDate?: string | null
}

export function isValidDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function includesValue<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

export function validateReserveCadence(value: unknown): value is ReserveContributionCadence {
  return includesValue(RESERVE_CONTRIBUTION_CADENCES, value)
}

export function validateReservePaymentCadence(value: unknown): value is ReservePaymentCadence {
  return includesValue(RESERVE_PAYMENT_CADENCES, value)
}

export function validateReserveStatus(value: unknown): value is ReserveStatus {
  return includesValue(RESERVE_STATUSES, value)
}

export function validateReserveMovementType(value: unknown): value is ReserveMovementType {
  return includesValue(RESERVE_MOVEMENT_TYPES, value)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, maxDay))
  return next
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function nextContributionDate(fromDate: string, cadence: ReserveContributionCadence): string | null {
  if (cadence === 'custom') return null
  const date = new Date(`${fromDate}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return null

  if (cadence === 'weekly') return toIsoDate(addDays(date, 7))
  if (cadence === 'biweekly') return toIsoDate(addDays(date, 14))
  return toIsoDate(addMonths(date, 1))
}

export async function verifyAccountBelongsToUser(db: any, accountId: number, userId: number) {
  const [account] = await db
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1)

  return account ?? null
}

export async function getReserveForUser(db: any, reserveId: number, userId: number) {
  const [reserve] = await db
    .select()
    .from(reserves)
    .where(and(eq(reserves.id, reserveId), eq(reserves.userId, userId)))
    .limit(1)

  return reserve ?? null
}

export async function listReservesForUser(db: any, userId: number): Promise<ReserveSummaryRow[]> {
  const rows = await db
    .select({
      id: reserves.id,
      userId: reserves.userId,
      accountId: reserves.accountId,
      accountName: accounts.name,
      accountColor: accounts.color,
      name: reserves.name,
      targetAmount: reserves.targetAmount,
      currentReservedAmount: reserves.currentReservedAmount,
      contributionAmount: reserves.contributionAmount,
      contributionCadence: reserves.contributionCadence,
      actualPaymentCadence: reserves.actualPaymentCadence,
      nextDueDate: reserves.nextDueDate,
      category: reserves.category,
      status: reserves.status,
      notes: reserves.notes,
      lastAccruedDate: reserves.lastAccruedDate,
      createdAt: reserves.createdAt,
    })
    .from(reserves)
    .leftJoin(accounts, eq(reserves.accountId, accounts.id))
    .where(eq(reserves.userId, userId))
    .orderBy(asc(reserves.status), asc(reserves.nextDueDate), asc(reserves.name))

  return rows.map(row => enrichReserveRow(row as ReserveSummaryRow))
}

export async function listReserveMovements(db: any, reserveId: number, userId: number) {
  const reserve = await getReserveForUser(db, reserveId, userId)
  if (!reserve) return null

  return db
    .select({
      id: reserveMovements.id,
      reserveId: reserveMovements.reserveId,
      date: reserveMovements.date,
      amount: reserveMovements.amount,
      type: reserveMovements.type,
      linkedTransactionId: reserveMovements.linkedTransactionId,
      notes: reserveMovements.notes,
      createdAt: reserveMovements.createdAt,
      transaction: {
        id: transactions.id,
        transactionDate: transactions.transactionDate,
        description: transactions.description,
        amount: transactions.amount,
      },
    })
    .from(reserveMovements)
    .leftJoin(transactions, eq(reserveMovements.linkedTransactionId, transactions.id))
    .where(eq(reserveMovements.reserveId, reserveId))
    .orderBy(asc(reserveMovements.date), asc(reserveMovements.id))
}

export function enrichReserveRow<T extends {
  targetAmount: number
  currentReservedAmount: number
}>(row: T): T & { progress: number | null, shortfall: number, surplus: number } {
  const target = Number(row.targetAmount)
  const current = Number(row.currentReservedAmount)
  return {
    ...row,
    progress: target > 0 ? Math.min(current / target, 1) : null,
    shortfall: roundMoney(Math.max(target - current, 0)),
    surplus: roundMoney(Math.max(current - target, 0)),
  }
}

export async function createReserve(db: any, userId: number, input: CreateReserveInput) {
  const account = await verifyAccountBelongsToUser(db, input.accountId, userId)
  if (!account) {
    throw createError({ statusCode: 400, message: 'Account not found' })
  }
  if (!input.name.trim()) {
    throw createError({ statusCode: 400, message: 'name must be a non-empty string' })
  }
  if (!isValidDateString(input.nextDueDate)) {
    throw createError({ statusCode: 400, message: 'nextDueDate must be YYYY-MM-DD' })
  }

  const initialAmount = roundMoney(input.currentReservedAmount ?? 0)
  const [created] = await db.insert(reserves).values({
    userId,
    accountId: input.accountId,
    name: input.name.trim(),
    targetAmount: roundMoney(input.targetAmount),
    currentReservedAmount: initialAmount,
    contributionAmount: roundMoney(input.contributionAmount ?? 0),
    contributionCadence: input.contributionCadence ?? 'monthly',
    actualPaymentCadence: input.actualPaymentCadence ?? 'monthly',
    nextDueDate: input.nextDueDate,
    category: input.category?.trim() || null,
    status: input.status ?? 'active',
    notes: input.notes?.trim() || null,
    lastAccruedDate: input.lastAccruedDate ?? null,
  }).returning()

  if (initialAmount !== 0) {
    await db.insert(reserveMovements).values({
      reserveId: created.id,
      date: input.openingMovementDate ?? new Date().toISOString().slice(0, 10),
      amount: initialAmount,
      type: 'adjustment',
      notes: 'Opening reserved amount',
    })
  }

  return enrichReserveRow({ ...created, accountName: account.name, accountColor: null } as any)
}

export async function updateReserve(db: any, userId: number, reserveId: number, input: UpdateReserveInput) {
  const existing = await getReserveForUser(db, reserveId, userId)
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Reserve not found' })
  }

  const updates: Partial<typeof reserves.$inferInsert> = {}
  if (input.accountId !== undefined) {
    const account = await verifyAccountBelongsToUser(db, input.accountId, userId)
    if (!account) throw createError({ statusCode: 400, message: 'Account not found' })
    updates.accountId = input.accountId
  }
  if (input.name !== undefined) {
    if (!input.name.trim()) throw createError({ statusCode: 400, message: 'name must be a non-empty string' })
    updates.name = input.name.trim()
  }
  if (input.targetAmount !== undefined) updates.targetAmount = roundMoney(input.targetAmount)
  if (input.currentReservedAmount !== undefined) updates.currentReservedAmount = roundMoney(input.currentReservedAmount)
  if (input.contributionAmount !== undefined) updates.contributionAmount = roundMoney(input.contributionAmount)
  if (input.contributionCadence !== undefined) updates.contributionCadence = input.contributionCadence
  if (input.actualPaymentCadence !== undefined) updates.actualPaymentCadence = input.actualPaymentCadence
  if (input.nextDueDate !== undefined) {
    if (!isValidDateString(input.nextDueDate)) throw createError({ statusCode: 400, message: 'nextDueDate must be YYYY-MM-DD' })
    updates.nextDueDate = input.nextDueDate
  }
  if (input.category !== undefined) updates.category = input.category?.trim() || null
  if (input.status !== undefined) updates.status = input.status
  if (input.notes !== undefined) updates.notes = input.notes?.trim() || null
  if (input.lastAccruedDate !== undefined) updates.lastAccruedDate = input.lastAccruedDate

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const [updated] = await db
    .update(reserves)
    .set(updates)
    .where(and(eq(reserves.id, reserveId), eq(reserves.userId, userId)))
    .returning()

  return enrichReserveRow(updated)
}

function movementDelta(type: ReserveMovementType, amount: number): number {
  if (type === 'contribution') return Math.abs(amount)
  if (type === 'release') return -Math.abs(amount)
  return amount
}

export async function addReserveMovement(db: any, userId: number, input: ReserveMovementInput) {
  const reserve = await getReserveForUser(db, input.reserveId, userId)
  if (!reserve) {
    throw createError({ statusCode: 404, message: 'Reserve not found' })
  }

  if (input.linkedTransactionId !== undefined && input.linkedTransactionId !== null) {
    const [tx] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(
        eq(transactions.id, input.linkedTransactionId),
        eq(accounts.userId, userId),
        eq(transactions.accountId, reserve.accountId),
      ))
      .limit(1)

    if (!tx) {
      throw createError({ statusCode: 400, message: 'Linked transaction must belong to the same reserved account' })
    }
  }

  const delta = movementDelta(input.type, roundMoney(input.amount))
  const nextAmount = roundMoney(Number(reserve.currentReservedAmount) + delta)
  if (nextAmount < 0) {
    throw createError({ statusCode: 400, message: 'Reserve balance cannot be negative' })
  }

  const [movement] = await db.insert(reserveMovements).values({
    reserveId: input.reserveId,
    date: input.date,
    amount: delta,
    type: input.type,
    linkedTransactionId: input.linkedTransactionId ?? null,
    notes: input.notes?.trim() || null,
  }).returning()

  const [updatedReserve] = await db
    .update(reserves)
    .set({ currentReservedAmount: nextAmount })
    .where(eq(reserves.id, input.reserveId))
    .returning()

  return {
    movement,
    reserve: enrichReserveRow(updatedReserve),
  }
}

export async function autoAccrueReserves(db: any, userId: number, throughDate: string) {
  const active = await db
    .select()
    .from(reserves)
    .where(and(eq(reserves.userId, userId), eq(reserves.status, 'active')))

  const accrued: any[] = []
  for (const reserve of active) {
    if (reserve.contributionCadence === 'custom' || reserve.contributionAmount <= 0) continue

    let accrualDate = reserve.lastAccruedDate
      ? nextContributionDate(reserve.lastAccruedDate, reserve.contributionCadence as ReserveContributionCadence)
      : new Date().toISOString().slice(0, 10)

    while (accrualDate && accrualDate <= throughDate) {
      const result = await addReserveMovement(db, userId, {
        reserveId: reserve.id,
        date: accrualDate,
        amount: reserve.contributionAmount,
        type: 'contribution',
        notes: 'Auto-accrued reserve contribution',
      })
      await db.update(reserves).set({ lastAccruedDate: accrualDate }).where(eq(reserves.id, reserve.id))
      accrued.push(result.movement)
      accrualDate = nextContributionDate(accrualDate, reserve.contributionCadence as ReserveContributionCadence)
    }
  }

  return accrued
}

export async function getAvailabilitySummary(db: any, userId: number) {
  const accountRows = await listAccountsWithBalances(db, userId)
  const cashAccounts = accountRows.filter(account => ['checking', 'savings', 'debit'].includes(account.type))
  const accountIds = cashAccounts.map(account => account.id)

  const reserveRows = accountIds.length === 0
    ? []
    : await db
      .select({
        accountId: reserves.accountId,
        amount: sql<number>`coalesce(sum(${reserves.currentReservedAmount}), 0)`,
      })
      .from(reserves)
      .where(and(
        eq(reserves.userId, userId),
        eq(reserves.status, 'active'),
        inArray(reserves.accountId, accountIds),
      ))
      .groupBy(reserves.accountId)

  const reserveByAccount = new Map<number, number>()
  for (const row of reserveRows) {
    reserveByAccount.set(row.accountId, Number(row.amount ?? 0))
  }

  const activeBills = await db
    .select()
    .from(bills)
    .where(and(eq(bills.userId, userId), eq(bills.isActive, true)))

  const scheduledUpcomingBills = activeBills.reduce((sum, bill) => sum + billAvailabilityAmount(bill), 0)
  const totalActiveReserves = Array.from(reserveByAccount.values()).reduce((sum, value) => sum + value, 0)

  let currentBalance = 0
  let pendingRealTransactions = 0
  let calculatedBalance = 0

  const accountsSummary = cashAccounts.map((account) => {
    const accountCurrent = account.currentBalance ?? account.calculatedBalance ?? 0
    const accountCalculated = account.calculatedBalance ?? accountCurrent
    const pending = account.delta ?? 0
    const reserveAmount = reserveByAccount.get(account.id) ?? 0
    const availableToSpend = roundMoney(accountCalculated - reserveAmount)

    currentBalance += accountCurrent
    calculatedBalance += accountCalculated
    pendingRealTransactions += pending

    return {
      id: account.id,
      name: account.name,
      type: account.type,
      color: account.color,
      currentBalance: roundMoney(accountCurrent),
      pendingRealTransactions: roundMoney(pending),
      calculatedBalance: roundMoney(accountCalculated),
      activeReserves: roundMoney(reserveAmount),
      availableToSpend,
    }
  })

  return {
    currentBalance: roundMoney(currentBalance),
    pendingRealTransactions: roundMoney(pendingRealTransactions),
    calculatedBalance: roundMoney(calculatedBalance),
    scheduledUpcomingBills: roundMoney(scheduledUpcomingBills),
    activeReserves: roundMoney(totalActiveReserves),
    availableToSpend: roundMoney(calculatedBalance - scheduledUpcomingBills - totalActiveReserves),
    accounts: accountsSummary,
  }
}

function billAvailabilityAmount(bill: typeof bills.$inferSelect): number {
  if (bill.occurrence === 'quarterly' && bill.spreadMonthly) return Number(bill.amount) / 3
  if (bill.occurrence === 'annual' && bill.spreadMonthly) return Number(bill.amount) / 12
  return Number(bill.amount)
}
