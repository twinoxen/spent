import { parse } from 'csv-parse/sync'
import type { ImportStrategy, NormalizedTransaction } from './types'

// Chase credit card and checking exports share these required columns.
// Checking accounts omit "Category" and "Memo" but always have the core four.
const REQUIRED_HEADERS = ['Transaction Date', 'Post Date', 'Description', 'Amount']
const OPTIONAL_HEADERS = ['Category', 'Type', 'Memo']

interface ChaseRow {
  'Transaction Date': string
  'Post Date': string
  'Description': string
  'Category'?: string
  'Type'?: string
  'Amount': string
  'Memo'?: string
}

function parseChaseDate(date: string): string {
  // Chase exports MM/DD/YYYY
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[1]}-${match[2]}`
  return date
}

function deriveType(row: ChaseRow): string {
  if (row['Type']) return row['Type']
  const amount = parseFloat(row['Amount'].replace(/,/g, ''))
  return amount >= 0 ? 'Credit' : 'Purchase'
}

export const chaseStrategy: ImportStrategy = {
  name: 'chase',

  canHandle(_filename: string, content: string): boolean {
    const firstLine = content.split('\n')[0] ?? ''
    const hasRequired = REQUIRED_HEADERS.every(h => firstLine.includes(h))
    // Must have at least one optional header to distinguish from other banks
    // that might coincidentally share the four required columns
    const hasOptional = OPTIONAL_HEADERS.some(h => firstLine.includes(h))
    return hasRequired && hasOptional
  },

  parse(content: string): NormalizedTransaction[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as ChaseRow[]

    return records.map((row) => {
      const rawAmount = parseFloat(row['Amount'].replace(/,/g, ''))
      // Chase already signs amounts correctly: negative = debit, positive = credit
      const amount = isNaN(rawAmount) ? 0 : rawAmount
      const description = row['Description'] || row['Memo'] || ''
      const type = deriveType(row)

      return {
        transactionDate: parseChaseDate(row['Transaction Date']),
        clearingDate: row['Post Date'] ? parseChaseDate(row['Post Date']) : undefined,
        description,
        merchantName: description,
        amount,
        type,
        sourceCategory: row['Category'] || undefined,
      }
    })
  },
}
