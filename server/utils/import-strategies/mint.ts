import { parse } from 'csv-parse/sync'
import type { ImportStrategy, NormalizedTransaction } from './types'

// Mint (Intuit) CSV export headers
const MINT_HEADERS = [
  'Date',
  'Description',
  'Original Description',
  'Amount',
  'Transaction Type',
  'Category',
  'Account Name',
]

interface MintRow {
  'Date': string
  'Description': string
  'Original Description': string
  'Amount': string
  'Transaction Type': string
  'Category': string
  'Account Name': string
  'Labels'?: string
  'Notes'?: string
}

function parseMintDate(date: string): string {
  // Mint exports MM/DD/YYYY
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[1]}-${match[2]}`
  return date
}

export const mintStrategy: ImportStrategy = {
  name: 'mint',

  canHandle(_filename: string, content: string): boolean {
    const firstLine = content.split('\n')[0] ?? ''
    return MINT_HEADERS.every(h => firstLine.includes(h))
  },

  parse(content: string): NormalizedTransaction[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as MintRow[]

    return records.map((row) => {
      const rawAmount = parseFloat(row['Amount'].replace(/,/g, ''))
      const amount = isNaN(rawAmount) ? 0 : rawAmount

      // Mint uses a "Transaction Type" column: "debit" = expense, "credit" = income
      const isDebit = row['Transaction Type']?.toLowerCase() === 'debit'
      const signedAmount = isDebit ? -Math.abs(amount) : Math.abs(amount)
      const type = isDebit ? 'Purchase' : 'Credit'

      return {
        transactionDate: parseMintDate(row['Date']),
        description: row['Original Description'] || row['Description'],
        merchantName: row['Description'],
        amount: signedAmount,
        type,
        sourceCategory: row['Category'] || undefined,
      }
    })
  },
}
