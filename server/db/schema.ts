import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull().default('credit_card'),
  institution: text('institution'),
  lastFour: text('last_four'),
  color: text('color').default('#6366f1'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
})

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parentId: integer('parent_id').references(() => categories.id, { onDelete: 'cascade' }),
  color: text('color'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (table) => ({
  parentIdIdx: index('categories_parent_id_idx').on(table.parentId),
}))

export const merchants = sqliteTable('merchants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  normalizedName: text('normalized_name').notNull().unique(),
  rawNames: text('raw_names', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (table) => ({
  normalizedNameIdx: index('merchants_normalized_name_idx').on(table.normalizedName),
}))

export const merchantRules = sqliteTable('merchant_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pattern: text('pattern').notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  priority: integer('priority').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (table) => ({
  categoryIdIdx: index('merchant_rules_category_id_idx').on(table.categoryId),
  priorityIdx: index('merchant_rules_priority_idx').on(table.priority),
}))

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  transactionDate: text('transaction_date').notNull(),
  clearingDate: text('clearing_date'),
  description: text('description').notNull(),
  merchantId: integer('merchant_id').references(() => merchants.id, { onDelete: 'set null' }),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  amount: real('amount').notNull(),
  purchasedBy: text('purchased_by'),
  sourceFile: text('source_file'),
  fingerprint: text('fingerprint').notNull().unique(),
  notes: text('notes'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  isDuplicateFlagged: integer('is_duplicate_flagged', { mode: 'boolean' }).default(false),
  importSessionId: integer('import_session_id').references(() => importSessions.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (table) => ({
  fingerprintIdx: index('transactions_fingerprint_idx').on(table.fingerprint),
  transactionDateIdx: index('transactions_transaction_date_idx').on(table.transactionDate),
  merchantIdIdx: index('transactions_merchant_id_idx').on(table.merchantId),
  categoryIdIdx: index('transactions_category_id_idx').on(table.categoryId),
  importSessionIdIdx: index('transactions_import_session_id_idx').on(table.importSessionId),
  accountIdIdx: index('transactions_account_id_idx').on(table.accountId),
}))

export const importSessions = sqliteTable('import_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  importedAt: integer('imported_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  rowCount: integer('row_count').notNull(),
  sourceType: text('source_type').notNull().default('apple_card'),
  status: text('status').notNull().default('pending_review'),
}, (table) => ({
  importedAtIdx: index('import_sessions_imported_at_idx').on(table.importedAt),
  accountIdIdx: index('import_sessions_account_id_idx').on(table.accountId),
}))

export const stagingTransactions = sqliteTable('staging_transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  importSessionId: integer('import_session_id').notNull().references(() => importSessions.id, { onDelete: 'cascade' }),
  transactionDate: text('transaction_date').notNull(),
  clearingDate: text('clearing_date'),
  description: text('description').notNull(),
  merchantName: text('merchant_name').notNull().default(''),
  sourceCategory: text('source_category'),
  amount: real('amount').notNull(),
  type: text('type').notNull(),
  purchasedBy: text('purchased_by'),
  fingerprint: text('fingerprint').notNull(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  isDuplicate: integer('is_duplicate', { mode: 'boolean' }).notNull().default(false),
  isSelected: integer('is_selected', { mode: 'boolean' }).notNull().default(true),
}, (table) => ({
  importSessionIdIdx: index('staging_transactions_import_session_id_idx').on(table.importSessionId),
}))
