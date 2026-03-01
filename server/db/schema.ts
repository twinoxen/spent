import { pgTable, text, integer, serial, boolean, timestamp, doublePrecision, jsonb, real, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').default(sql`now()`),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}))

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('credit_card'),
  institution: text('institution'),
  lastFour: text('last_four'),
  color: text('color').default('#6366f1'),
  createdAt: timestamp('created_at').default(sql`now()`),
}, (table) => ({
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
}))

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: integer('parent_id').references(() => categories.id, { onDelete: 'cascade' }),
  color: text('color'),
  icon: text('icon'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').default(sql`now()`),
}, (table) => ({
  userIdIdx: index('categories_user_id_idx').on(table.userId),
  parentIdIdx: index('categories_parent_id_idx').on(table.parentId),
}))

export const merchants = pgTable('merchants', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  normalizedName: text('normalized_name').notNull(),
  rawNames: jsonb('raw_names').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp('created_at').default(sql`now()`),
}, (table) => ({
  normalizedNameUserIdx: uniqueIndex('merchants_normalized_name_user_idx').on(table.normalizedName, table.userId),
}))

export const merchantRules = pgTable('merchant_rules', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  pattern: text('pattern').notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').default(sql`now()`),
}, (table) => ({
  userIdIdx: index('merchant_rules_user_id_idx').on(table.userId),
  categoryIdIdx: index('merchant_rules_category_id_idx').on(table.categoryId),
  priorityIdx: index('merchant_rules_priority_idx').on(table.priority),
}))

export const importSessions = pgTable('import_sessions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  importedAt: timestamp('imported_at').default(sql`now()`),
  rowCount: integer('row_count').notNull(),
  sourceType: text('source_type').notNull().default('apple_card'),
  status: text('status').notNull().default('pending_review'),
}, (table) => ({
  importedAtIdx: index('import_sessions_imported_at_idx').on(table.importedAt),
  accountIdIdx: index('import_sessions_account_id_idx').on(table.accountId),
}))

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  transactionDate: text('transaction_date').notNull(),
  clearingDate: text('clearing_date'),
  description: text('description').notNull(),
  merchantId: integer('merchant_id').references(() => merchants.id, { onDelete: 'set null' }),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  amount: doublePrecision('amount').notNull(),
  purchasedBy: text('purchased_by'),
  sourceFile: text('source_file'),
  fingerprint: text('fingerprint').notNull().unique(),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().default(sql`'[]'::jsonb`),
  isDuplicateFlagged: boolean('is_duplicate_flagged').default(false),
  importSessionId: integer('import_session_id').references(() => importSessions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').default(sql`now()`),
}, (table) => ({
  fingerprintIdx: index('transactions_fingerprint_idx').on(table.fingerprint),
  transactionDateIdx: index('transactions_transaction_date_idx').on(table.transactionDate),
  merchantIdIdx: index('transactions_merchant_id_idx').on(table.merchantId),
  categoryIdIdx: index('transactions_category_id_idx').on(table.categoryId),
  importSessionIdIdx: index('transactions_import_session_id_idx').on(table.importSessionId),
  accountIdIdx: index('transactions_account_id_idx').on(table.accountId),
}))

export const stagingTransactions = pgTable('staging_transactions', {
  id: serial('id').primaryKey(),
  importSessionId: integer('import_session_id').notNull().references(() => importSessions.id, { onDelete: 'cascade' }),
  transactionDate: text('transaction_date').notNull(),
  clearingDate: text('clearing_date'),
  description: text('description').notNull(),
  merchantName: text('merchant_name').notNull().default(''),
  sourceCategory: text('source_category'),
  amount: doublePrecision('amount').notNull(),
  type: text('type').notNull(),
  purchasedBy: text('purchased_by'),
  fingerprint: text('fingerprint').notNull(),
  categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
  isDuplicate: boolean('is_duplicate').notNull().default(false),
  duplicateOfId: integer('duplicate_of_id').references(() => transactions.id, { onDelete: 'set null' }),
  isSelected: boolean('is_selected').notNull().default(true),
}, (table) => ({
  importSessionIdIdx: index('staging_transactions_import_session_id_idx').on(table.importSessionId),
}))
