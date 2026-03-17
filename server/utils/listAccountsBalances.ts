import { eq, inArray } from 'drizzle-orm'
import { accounts, transactions } from '../db/schema'
import { computeAccountBalance, type AccountWithBalance, type RawAccountRow } from './computeBalances'

interface AccountRow {
  id: number
  name: string
  type: string
  institution: string | null
  lastFour: string | null
  color: string | null
  currentBalance: number | null
  balanceAsOfDate: string | null
  creditLimit: number | null
  apr: number | null
  createdAt: Date | null
}

// Sum of transactions that fall after the snapshot date, used for snapshot-anchored balance.
// Pending transactions on the snapshot date are included because they represent charges
// not yet reflected in the user-entered snapshot amount.
function isAfterSnapshot(tx: Pick<TransactionRow, 'transactionDate' | 'isPending'>, snapshotDate: string): boolean {
  if (tx.transactionDate > snapshotDate) return true
  if (tx.transactionDate === snapshotDate && tx.isPending) return true
  return false
}

interface TransactionRow {
  id: number
  accountId: number
  amount: number
  isPending: boolean | null
  isOpeningBalance: boolean
  transactionDate: string
}

function compareTxPosition(a: Pick<TransactionRow, 'transactionDate' | 'id'>, b: Pick<TransactionRow, 'transactionDate' | 'id'>) {
  if (a.transactionDate === b.transactionDate) return a.id - b.id
  return a.transactionDate > b.transactionDate ? 1 : -1
}

export function buildRawAccountRows(accountsRows: AccountRow[], transactionRows: TransactionRow[]): RawAccountRow[] {
  const txByAccount = new Map<number, TransactionRow[]>()

  for (const tx of transactionRows) {
    const list = txByAccount.get(tx.accountId)
    if (list) list.push(tx)
    else txByAccount.set(tx.accountId, [tx])
  }

  return accountsRows.map((account): RawAccountRow => {
    const txs = txByAccount.get(account.id) ?? []

    let totalTxAmount = 0
    let postedTxAmount = 0
    let pendingTxAmount = 0
    for (const tx of txs) {
      totalTxAmount += tx.amount
      if (tx.isPending) pendingTxAmount += tx.amount
      else postedTxAmount += tx.amount
    }

    let latestOpening: TransactionRow | null = null
    for (const tx of txs) {
      if (!tx.isOpeningBalance) continue
      if (!latestOpening || compareTxPosition(tx, latestOpening) > 0) {
        latestOpening = tx
      }
    }

    let anchoredTxAmount = 0
    if (!latestOpening) {
      anchoredTxAmount = totalTxAmount
    } else {
      anchoredTxAmount = latestOpening.amount
      for (const tx of txs) {
        if (tx.isOpeningBalance) continue
        if (compareTxPosition(tx, latestOpening) > 0) {
          anchoredTxAmount += tx.amount
        }
      }
    }

    // When the account has a reconciliation snapshot, compute the sum of transactions
    // that occurred after (or pending on) the snapshot date. This allows the balance
    // formula to use the snapshot as the authoritative anchor instead of the opening balance.
    let snapshotTxAmount: number | null = null
    if (account.balanceAsOfDate && account.currentBalance !== null) {
      snapshotTxAmount = 0
      for (const tx of txs) {
        if (tx.isOpeningBalance) continue
        if (isAfterSnapshot(tx, account.balanceAsOfDate)) {
          snapshotTxAmount += tx.amount
        }
      }
    }

    return {
      ...account,
      transactionCount: txs.length,
      totalTxAmount,
      postedTxAmount,
      pendingTxAmount,
      anchoredTxAmount,
      snapshotTxAmount,
      openingTxAmount: latestOpening?.amount ?? null,
      openingTxDate: latestOpening?.transactionDate ?? null,
    }
  })
}

export async function listAccountsWithBalances(db: any, userId: number): Promise<AccountWithBalance[]> {
  const accountRows = await db
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
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(accounts.name)

  if (accountRows.length === 0) return []

  const accountIds = accountRows.map(row => row.id)
  const transactionRows = await db
    .select({
      id: transactions.id,
      accountId: transactions.accountId,
      amount: transactions.amount,
      isPending: transactions.isPending,
      isOpeningBalance: transactions.isOpeningBalance,
      transactionDate: transactions.transactionDate,
    })
    .from(transactions)
    .where(inArray(transactions.accountId, accountIds))

  const rawRows = buildRawAccountRows(accountRows, transactionRows)
  return rawRows.map(computeAccountBalance)
}
