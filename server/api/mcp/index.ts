import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { eq, desc, and, not, sql, inArray } from 'drizzle-orm'
import { getDb } from '../../db'
import { transactions, accounts, categories, merchants, merchantRules } from '../../db/schema'
import { buildTransactionWhereClause } from '../../utils/transactionFilters'
import { generateFingerprint } from '../../utils/fingerprint'
import { toCsv } from '../../utils/exportFormats'
import { interAccountTransferCondition } from '../../utils/transferExclusion'

function buildMcpServer(userId: number) {
  const server = new McpServer({ name: 'spent', version: '1.0.0' })

  // ─── Accounts ──────────────────────────────────────────────────────────────

  server.tool('list_accounts', 'List all financial accounts with balances, transaction counts, credit limits, and utilization.', {}, async () => {
    const db = await getDb()
    const results = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        institution: accounts.institution,
        lastFour: accounts.lastFour,
        color: accounts.color,
        currentBalance: accounts.currentBalance,
        balanceAsOfDate: accounts.balanceAsOfDate,
        creditLimit: accounts.creditLimit,
        apr: accounts.apr,
        transactionCount: sql<number>`count(${transactions.id})`,
        txSumAfterSnapshot: sql<number | null>`
          sum(
            case
              when ${accounts.balanceAsOfDate} is not null
                and ${transactions.transactionDate} > ${accounts.balanceAsOfDate}
              then ${transactions.amount}
              else null
            end
          )
        `,
      })
      .from(accounts)
      .leftJoin(transactions, eq(transactions.accountId, accounts.id))
      .where(eq(accounts.userId, userId))
      .groupBy(accounts.id)
      .orderBy(accounts.name)

    const { computeAccountBalance } = await import('../../utils/computeBalances')
    const enriched = results.map(row => computeAccountBalance(row as any))
    return { content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }] }
  })

  server.tool('update_account', 'Update an existing financial account.', {
    id: z.number().describe('Account ID'),
    name: z.string().optional().describe('Account name'),
    type: z.enum(['credit_card', 'checking', 'savings', 'investment', 'other']).optional(),
    institution: z.string().nullable().optional(),
    lastFour: z.string().nullable().optional().describe('Last 4 digits'),
    currentBalance: z.number().nullable().optional(),
    balanceAsOfDate: z.string().nullable().optional().describe('YYYY-MM-DD'),
    creditLimit: z.number().nullable().optional(),
    apr: z.number().nullable().optional(),
  }, async (args) => {
    const db = await getDb()
    const { id, ...fields } = args
    const updates: Record<string, unknown> = {}
    if (fields.name !== undefined) updates.name = fields.name.trim()
    if (fields.type !== undefined) updates.type = fields.type
    if (fields.institution !== undefined) updates.institution = fields.institution?.trim() ?? null
    if (fields.lastFour !== undefined) updates.lastFour = fields.lastFour?.trim() ?? null
    if (fields.currentBalance !== undefined) updates.currentBalance = fields.currentBalance
    if (fields.balanceAsOfDate !== undefined) updates.balanceAsOfDate = fields.balanceAsOfDate?.trim() ?? null
    if (fields.creditLimit !== undefined) updates.creditLimit = fields.creditLimit
    if (fields.apr !== undefined) updates.apr = fields.apr

    if (Object.keys(updates).length === 0) {
      return { isError: true, content: [{ type: 'text', text: 'No fields to update.' }] }
    }

    const [updated] = await db
      .update(accounts)
      .set(updates)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
      .returning()

    if (!updated) {
      return { isError: true, content: [{ type: 'text', text: 'Account not found or does not belong to you.' }] }
    }

    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] }
  })

  server.tool('delete_account', 'Delete a financial account and all its transactions.', {
    id: z.number().describe('Account ID'),
  }, async (args) => {
    const db = await getDb()

    const [deleted] = await db
      .delete(accounts)
      .where(and(eq(accounts.id, args.id), eq(accounts.userId, userId)))
      .returning({ id: accounts.id })

    if (!deleted) {
      return { isError: true, content: [{ type: 'text', text: 'Account not found or does not belong to you.' }] }
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deletedId: args.id }) }] }
  })

  server.tool('create_account', 'Create a new financial account.', {
    name: z.string().describe('Account name'),
    type: z.enum(['credit_card', 'checking', 'savings', 'investment', 'other']).optional().default('credit_card'),
    institution: z.string().optional().describe('Bank or institution name'),
    lastFour: z.string().optional().describe('Last 4 digits of the card/account number'),
    currentBalance: z.number().optional().describe('Current balance snapshot (amount owed for credit cards, available balance for checking/savings)'),
    balanceAsOfDate: z.string().optional().describe('Date of the balance snapshot in YYYY-MM-DD format'),
    creditLimit: z.number().optional().describe('Total credit limit (credit cards only)'),
    apr: z.number().optional().describe('Annual percentage rate, e.g. 24.99 (credit cards only)'),
  }, async (args) => {
    const db = await getDb()
    const isCreditCard = args.type === 'credit_card'
    const [created] = await db.insert(accounts).values({
      userId,
      name: args.name,
      type: args.type,
      institution: args.institution ?? null,
      lastFour: args.lastFour ?? null,
      currentBalance: args.currentBalance ?? null,
      balanceAsOfDate: args.balanceAsOfDate ?? null,
      creditLimit: isCreditCard ? (args.creditLimit ?? null) : null,
      apr: isCreditCard ? (args.apr ?? null) : null,
    }).returning()
    return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] }
  })

  // ─── Categories ────────────────────────────────────────────────────────────

  server.tool('list_categories', 'List all spending categories.', {}, async () => {
    const db = await getDb()
    const results = await db
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        color: categories.color,
        icon: categories.icon,
      })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.sortOrder, categories.name)

    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] }
  })

  server.tool('create_category', 'Create a new spending category.', {
    name: z.string().describe('Category name'),
    parentId: z.number().nullable().optional().describe('Parent category ID for subcategories'),
    color: z.string().optional().describe('Hex color, e.g. #e63946'),
    icon: z.string().optional().describe('Emoji or icon name'),
    sortOrder: z.number().optional().default(0),
  }, async (args) => {
    const db = await getDb()

    if (!args.name.trim()) {
      return { isError: true, content: [{ type: 'text', text: 'Category name is required.' }] }
    }

    const [created] = await db.insert(categories).values({
      userId,
      name: args.name.trim(),
      parentId: args.parentId ?? null,
      color: args.color ?? null,
      icon: args.icon ?? null,
      sortOrder: args.sortOrder ?? 0,
    }).returning()

    return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] }
  })

  server.tool('update_category', 'Rename or modify a category.', {
    id: z.number().describe('Category ID'),
    name: z.string().optional(),
    parentId: z.number().nullable().optional(),
    color: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
  }, async (args) => {
    const db = await getDb()
    const { id, ...fields } = args
    const updates: Record<string, unknown> = {}

    if (fields.name !== undefined) {
      if (!fields.name.trim()) {
        return { isError: true, content: [{ type: 'text', text: 'Category name cannot be empty.' }] }
      }
      updates.name = fields.name.trim()
    }
    if (fields.parentId !== undefined) updates.parentId = fields.parentId
    if (fields.color !== undefined) updates.color = fields.color
    if (fields.icon !== undefined) updates.icon = fields.icon
    if (fields.sortOrder !== undefined) updates.sortOrder = fields.sortOrder

    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning()

    if (!updated) {
      return { isError: true, content: [{ type: 'text', text: 'Category not found or does not belong to you.' }] }
    }

    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] }
  })

  server.tool('delete_category', 'Delete a category (transactions will become uncategorized).', {
    id: z.number().describe('Category ID'),
  }, async (args) => {
    const db = await getDb()

    const [deleted] = await db
      .delete(categories)
      .where(and(eq(categories.id, args.id), eq(categories.userId, userId)))
      .returning()

    if (!deleted) {
      return { isError: true, content: [{ type: 'text', text: 'Category not found or does not belong to you.' }] }
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted }) }] }
  })

  // ─── Transactions ──────────────────────────────────────────────────────────

  server.tool('list_transactions', 'List transactions with optional filters.', {
    accountId: z.number().optional().describe('Filter by account ID'),
    categoryId: z.number().optional().describe('Filter by category ID'),
    search: z.string().optional().describe('Search by description or notes'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    limit: z.number().optional().default(50).describe('Number of results (default 50, max 500)'),
    offset: z.number().optional().default(0),
  }, async (args) => {
    const db = await getDb()
    const userAccountIds = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))

    const whereClause = buildTransactionWhereClause(userAccountIds, {
      accountId: args.accountId,
      categoryId: args.categoryId,
      search: args.search,
      startDate: args.startDate,
      endDate: args.endDate,
    })

    const limit = Math.min(args.limit ?? 50, 500)
    const results = await db
      .select({
        id: transactions.id,
        transactionDate: transactions.transactionDate,
        description: transactions.description,
        type: transactions.type,
        amount: transactions.amount,
        purchasedBy: transactions.purchasedBy,
        notes: transactions.notes,
        tags: transactions.tags,
        merchant: merchants.normalizedName,
        category: categories.name,
        account: accounts.name,
      })
      .from(transactions)
      .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(whereClause)
      .orderBy(desc(transactions.transactionDate), desc(transactions.id))
      .limit(limit)
      .offset(args.offset ?? 0)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause)

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ transactions: results, total: count, limit, offset: args.offset ?? 0 }, null, 2),
      }],
    }
  })

  server.tool('create_transaction', 'Create a new transaction manually.', {
    accountId: z.number().describe('ID of the account'),
    description: z.string().describe('Transaction description'),
    amount: z.number().describe('Amount (positive = income, negative = expense)'),
    transactionDate: z.string().describe('Date in YYYY-MM-DD format'),
    type: z.string().optional().default('Purchase').describe('Transaction type: Purchase, Payment, Refund, etc.'),
    categoryId: z.number().optional().describe('Category ID'),
    notes: z.string().optional(),
    merchantName: z.string().optional().describe('Merchant / payee name'),
    purchasedBy: z.string().optional(),
  }, async (args) => {
    const db = await getDb()

    // Verify account belongs to user
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, args.accountId), eq(accounts.userId, userId)))
      .limit(1)

    if (!account) {
      return { isError: true, content: [{ type: 'text', text: 'Account not found or does not belong to you.' }] }
    }

    // Verify category if provided
    if (args.categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, args.categoryId), eq(categories.userId, userId)))
        .limit(1)
      if (!cat) {
        return { isError: true, content: [{ type: 'text', text: 'Category not found or does not belong to you.' }] }
      }
    }

    const INCOME_TYPES = new Set(['Payment', 'Credit', 'Adjustment', 'Deposit', 'Refund'])
    const isIncome = INCOME_TYPES.has(args.type ?? 'Purchase')
    const signedAmount = isIncome ? Math.abs(args.amount) : -Math.abs(args.amount)

    const fingerprint = generateFingerprint(args.transactionDate, args.description, signedAmount, args.purchasedBy ?? '')

    const [existing] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.fingerprint, fingerprint))
      .limit(1)

    if (existing) {
      return { isError: true, content: [{ type: 'text', text: 'A transaction with identical details already exists.' }] }
    }

    // Find or create merchant
    let resolvedMerchantId: number | null = null
    const trimmedMerchantName = args.merchantName?.trim()
    if (trimmedMerchantName) {
      const [existingMerchant] = await db
        .select({ id: merchants.id, rawNames: merchants.rawNames })
        .from(merchants)
        .where(and(eq(merchants.normalizedName, trimmedMerchantName), eq(merchants.userId, userId)))
        .limit(1)

      if (existingMerchant) {
        resolvedMerchantId = existingMerchant.id
      } else {
        const [newMerchant] = await db.insert(merchants).values({
          userId,
          normalizedName: trimmedMerchantName,
          rawNames: [args.description],
        }).returning()
        resolvedMerchantId = newMerchant?.id ?? null
      }
    }

    const [created] = await db.insert(transactions).values({
      accountId: args.accountId,
      transactionDate: args.transactionDate,
      description: args.description,
      type: args.type ?? 'Purchase',
      amount: signedAmount,
      merchantId: resolvedMerchantId,
      categoryId: args.categoryId ?? null,
      purchasedBy: args.purchasedBy ?? null,
      notes: args.notes ?? null,
      fingerprint,
      sourceFile: 'mcp',
    }).returning()

    return { content: [{ type: 'text', text: JSON.stringify(created, null, 2) }] }
  })

  server.tool('update_transaction', 'Update a transaction\'s category, notes, or tags.', {
    id: z.number().describe('Transaction ID'),
    categoryId: z.number().nullable().optional().describe('New category ID (null to uncategorize)'),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }, async (args) => {
    const db = await getDb()
    const userAccountIds = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))

    const updates: Record<string, unknown> = {}
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId
    if (args.notes !== undefined) updates.notes = args.notes
    if (args.tags !== undefined) updates.tags = args.tags

    const [updated] = await db
      .update(transactions)
      .set(updates)
      .where(and(
        eq(transactions.id, args.id),
        inArray(transactions.accountId, userAccountIds),
      ))
      .returning()

    if (!updated) {
      return { isError: true, content: [{ type: 'text', text: 'Transaction not found or does not belong to you.' }] }
    }

    return { content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }] }
  })

  server.tool('delete_transaction', 'Delete a transaction permanently.', {
    id: z.number().describe('Transaction ID'),
  }, async (args) => {
    const db = await getDb()

    const [tx] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(eq(transactions.id, args.id), eq(accounts.userId, userId)))
      .limit(1)

    if (!tx) {
      return { isError: true, content: [{ type: 'text', text: 'Transaction not found or does not belong to you.' }] }
    }

    await db.delete(transactions).where(eq(transactions.id, args.id))
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deletedId: args.id }) }] }
  })

  server.tool('get_daily_spending', 'Get per-day spending (or income) totals for a date range.', {
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    year: z.number().optional().describe('Filter by year (use with month)'),
    month: z.number().optional().describe('Filter by month 1-12 (use with year)'),
    accountId: z.number().optional(),
    flow: z.enum(['expense', 'income']).optional().default('expense').describe('expense (default) or income'),
  }, async (args) => {
    const db = await getDb()
    const userAccountIds = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))

    const flowCondition = args.flow === 'income'
      ? sql`${transactions.amount} > 0`
      : sql`${transactions.amount} < 0`
    const sumExpr = args.flow === 'income'
      ? sql<number>`sum(${transactions.amount})`
      : sql<number>`-sum(${transactions.amount})`

    const conditions: any[] = [
      flowCondition,
      inArray(transactions.accountId, userAccountIds),
      not(interAccountTransferCondition(userId)),
    ]

    if (args.year && args.month) {
      const year = String(args.year)
      const month = String(args.month).padStart(2, '0')
      conditions.push(sql`substr(${transactions.transactionDate}, 1, 4) = ${year}`)
      conditions.push(sql`substr(${transactions.transactionDate}, 6, 2) = ${month}`)
    } else {
      if (args.startDate) conditions.push(sql`${transactions.transactionDate} >= ${args.startDate}`)
      if (args.endDate) conditions.push(sql`${transactions.transactionDate} <= ${args.endDate}`)
    }

    if (args.accountId) conditions.push(eq(transactions.accountId, args.accountId))

    const rows = await db
      .select({
        date: transactions.transactionDate,
        total: sumExpr,
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(transactions.transactionDate)
      .orderBy(transactions.transactionDate)

    return { content: [{ type: 'text', text: JSON.stringify({ flow: args.flow, days: rows }, null, 2) }] }
  })

  // ─── Stats ─────────────────────────────────────────────────────────────────

  server.tool('get_spending_stats', 'Get spending statistics: totals, by-category breakdown, and top merchants.', {
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    accountId: z.number().optional(),
  }, async (args) => {
    const db = await getDb()
    const userAccountIds = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))

    const baseConditions: any[] = [
      inArray(transactions.accountId, userAccountIds),
      not(interAccountTransferCondition(userId)),
    ]

    // Dates stored as YYYY-MM-DD — lexicographic comparison works directly
    if (args.startDate) {
      baseConditions.push(sql`${transactions.transactionDate} >= ${args.startDate}`)
    }
    if (args.endDate) {
      baseConditions.push(sql`${transactions.transactionDate} <= ${args.endDate}`)
    }
    if (args.accountId) {
      baseConditions.push(eq(transactions.accountId, args.accountId))
    }

    const expenseConditions = [...baseConditions, sql`${transactions.amount} < 0`]
    const incomeConditions = [...baseConditions, sql`${transactions.amount} > 0`]

    const [expenseResult, incomeResult, spendByCategory, topMerchants] = await Promise.all([
      db.select({ total: sql<number>`-sum(${transactions.amount})` })
        .from(transactions).where(and(...expenseConditions)),
      db.select({ total: sql<number>`sum(${transactions.amount})` })
        .from(transactions).where(and(...incomeConditions)),
      db.select({
        categoryName: categories.name,
        total: sql<number>`-sum(${transactions.amount})`,
        count: sql<number>`count(*)`,
      })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(...expenseConditions))
        .groupBy(transactions.categoryId, categories.name)
        .orderBy(desc(sql<number>`-sum(${transactions.amount})`)),
      db.select({
        merchantName: merchants.normalizedName,
        total: sql<number>`-sum(${transactions.amount})`,
        count: sql<number>`count(*)`,
      })
        .from(transactions)
        .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
        .where(and(...expenseConditions))
        .groupBy(transactions.merchantId, merchants.normalizedName)
        .orderBy(desc(sql<number>`-sum(${transactions.amount})`))
        .limit(10),
    ])

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          totalExpenses: expenseResult[0]?.total ?? 0,
          totalIncome: incomeResult[0]?.total ?? 0,
          spendByCategory,
          topMerchants,
        }, null, 2),
      }],
    }
  })

  // ─── Merchants ─────────────────────────────────────────────────────────────

  server.tool('list_merchants', 'List all merchants with their normalized names and raw name variants.', {
    search: z.string().optional().describe('Filter by name (case-insensitive substring match)'),
  }, async (args) => {
    const db = await getDb()
    const results = await db
      .select({
        id: merchants.id,
        normalizedName: merchants.normalizedName,
        rawNames: merchants.rawNames,
      })
      .from(merchants)
      .where(eq(merchants.userId, userId))
      .orderBy(merchants.normalizedName)

    const filtered = args.search?.trim()
      ? results.filter(m =>
          m.normalizedName.toLowerCase().includes(args.search!.toLowerCase()) ||
          (m.rawNames as string[]).some(r => r.toLowerCase().includes(args.search!.toLowerCase())),
        )
      : results

    return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] }
  })

  server.tool('merge_merchants', 'Merge two or more merchants into one, reassigning all their transactions.', {
    targetId: z.number().describe('ID of the merchant to keep'),
    sourceIds: z.array(z.number()).describe('IDs of merchants to merge into the target and delete'),
    newName: z.string().optional().describe('Optional new normalized name for the merged merchant'),
  }, async (args) => {
    const db = await getDb()

    // Verify target belongs to user
    const [target] = await db
      .select({ id: merchants.id, normalizedName: merchants.normalizedName, rawNames: merchants.rawNames })
      .from(merchants)
      .where(and(eq(merchants.id, args.targetId), eq(merchants.userId, userId)))
      .limit(1)

    if (!target) {
      return { isError: true, content: [{ type: 'text', text: 'Target merchant not found or does not belong to you.' }] }
    }

    // Verify all sources belong to user
    const sources = await db
      .select({ id: merchants.id, normalizedName: merchants.normalizedName, rawNames: merchants.rawNames })
      .from(merchants)
      .where(and(inArray(merchants.id, args.sourceIds), eq(merchants.userId, userId)))

    if (sources.length !== args.sourceIds.length) {
      return { isError: true, content: [{ type: 'text', text: 'One or more source merchants not found or do not belong to you.' }] }
    }

    // Collect all raw names
    const allRawNames = Array.from(new Set([
      ...(target.rawNames as string[]),
      ...sources.flatMap(s => s.rawNames as string[]),
    ]))

    // Reassign transactions from sources to target
    await db
      .update(transactions)
      .set({ merchantId: args.targetId })
      .where(inArray(transactions.merchantId, args.sourceIds))

    // Delete source merchants
    await db.delete(merchants).where(inArray(merchants.id, args.sourceIds))

    // Update target with merged raw names (and optional new name)
    const [updated] = await db
      .update(merchants)
      .set({
        rawNames: allRawNames,
        ...(args.newName ? { normalizedName: args.newName.trim() } : {}),
      })
      .where(eq(merchants.id, args.targetId))
      .returning()

    return { content: [{ type: 'text', text: JSON.stringify({ merged: updated, absorbedIds: args.sourceIds }) }] }
  })

  // ─── Merchant Rules ────────────────────────────────────────────────────────

  server.tool('list_merchant_rules', 'List merchant auto-categorization rules.', {}, async () => {
    const db = await getDb()
    const results = await db
      .select({
        id: merchantRules.id,
        pattern: merchantRules.pattern,
        priority: merchantRules.priority,
        category: categories.name,
        categoryId: merchantRules.categoryId,
      })
      .from(merchantRules)
      .leftJoin(categories, eq(merchantRules.categoryId, categories.id))
      .where(eq(merchantRules.userId, userId))
      .orderBy(desc(merchantRules.priority))

    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] }
  })

  server.tool('create_merchant_rule', 'Create an auto-categorization rule that maps a merchant name pattern to a category.', {
    pattern: z.string().describe('Merchant name pattern to match (case-insensitive substring)'),
    categoryId: z.number().describe('Category ID to assign'),
    priority: z.number().optional().default(100).describe('Higher priority rules match first (default 100)'),
    merchantId: z.number().optional().describe('If provided with applyToExisting=true, back-fills all transactions for this merchant'),
    applyToExisting: z.boolean().optional().default(false).describe('Also apply this rule to all existing transactions for merchantId'),
  }, async (args) => {
    const db = await getDb()

    if (!args.pattern.trim()) {
      return { isError: true, content: [{ type: 'text', text: 'Pattern is required.' }] }
    }

    // Verify category belongs to user
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, args.categoryId), eq(categories.userId, userId)))
      .limit(1)

    if (!cat) {
      return { isError: true, content: [{ type: 'text', text: 'Category not found or does not belong to you.' }] }
    }

    const [newRule] = await db.insert(merchantRules).values({
      userId,
      pattern: args.pattern.trim().toLowerCase(),
      categoryId: args.categoryId,
      priority: args.priority ?? 100,
    }).returning()

    let affectedCount = 0

    if (args.applyToExisting && args.merchantId) {
      const [merchant] = await db
        .select({ id: merchants.id })
        .from(merchants)
        .where(and(eq(merchants.id, args.merchantId), eq(merchants.userId, userId)))
        .limit(1)

      if (merchant) {
        const userAccounts = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, userId))
        const accountIds = userAccounts.map(a => a.id)

        if (accountIds.length > 0) {
          const result = await db
            .update(transactions)
            .set({ categoryId: args.categoryId })
            .where(and(eq(transactions.merchantId, args.merchantId), inArray(transactions.accountId, accountIds)))
            .returning({ id: transactions.id })
          affectedCount = result.length
        }
      }
    }

    return { content: [{ type: 'text', text: JSON.stringify({ rule: newRule, affectedCount }) }] }
  })

  server.tool('delete_merchant_rule', 'Delete a merchant auto-categorization rule.', {
    id: z.number().describe('Merchant rule ID'),
  }, async (args) => {
    const db = await getDb()

    const [deleted] = await db
      .delete(merchantRules)
      .where(and(eq(merchantRules.id, args.id), eq(merchantRules.userId, userId)))
      .returning()

    if (!deleted) {
      return { isError: true, content: [{ type: 'text', text: 'Merchant rule not found or does not belong to you.' }] }
    }

    return { content: [{ type: 'text', text: JSON.stringify({ success: true, deleted }) }] }
  })

  // ─── CSV Export ────────────────────────────────────────────────────────────

  server.tool('export_transactions_csv', 'Export transactions as CSV text. Supports same filters as list_transactions.', {
    accountId: z.number().optional(),
    categoryId: z.number().optional(),
    search: z.string().optional(),
    startDate: z.string().optional().describe('YYYY-MM-DD'),
    endDate: z.string().optional().describe('YYYY-MM-DD'),
  }, async (args) => {
    const db = await getDb()
    const userAccountIds = db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.userId, userId))

    const whereClause = buildTransactionWhereClause(userAccountIds, args)

    const rows = await db
      .select({
        transactionDate: transactions.transactionDate,
        clearingDate: transactions.clearingDate,
        description: transactions.description,
        merchant: merchants.normalizedName,
        category: categories.name,
        type: transactions.type,
        amount: transactions.amount,
        purchasedBy: transactions.purchasedBy,
        account: accounts.name,
        notes: transactions.notes,
        tags: transactions.tags,
      })
      .from(transactions)
      .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(whereClause)
      .orderBy(desc(transactions.transactionDate), desc(transactions.id))

    const csv = toCsv(rows, [
      { header: 'Date', value: r => r.transactionDate },
      { header: 'Description', value: r => r.description },
      { header: 'Merchant', value: r => r.merchant },
      { header: 'Category', value: r => r.category },
      { header: 'Type', value: r => r.type },
      { header: 'Amount', value: r => r.amount },
      { header: 'Purchased By', value: r => r.purchasedBy },
      { header: 'Account', value: r => r.account },
      { header: 'Notes', value: r => r.notes },
      { header: 'Tags', value: r => r.tags?.join(', ') },
      { header: 'Clearing Date', value: r => r.clearingDate },
    ])

    return { content: [{ type: 'text', text: csv }] }
  })

  return server
}

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id

  const mcpServer = buildMcpServer(userId)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

  await mcpServer.connect(transport)

  const method = getMethod(event)
  let parsedBody: unknown
  if (method === 'POST') {
    parsedBody = await readBody(event)
  }

  await transport.handleRequest(event.node.req, event.node.res, parsedBody)

  // Tell H3/Nitro the response has already been sent by the MCP transport
  event.handled = true
})
