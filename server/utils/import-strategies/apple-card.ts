import { parse } from 'csv-parse/sync'
import type { ImportStrategy, NormalizedTransaction } from './types'

const APPLE_CARD_HEADERS = [
  'Transaction Date',
  'Clearing Date',
  'Description',
  'Merchant',
  'Category',
  'Type',
  'Amount (USD)',
  'Purchased By',
]

interface AppleCardRow {
  'Transaction Date': string
  'Clearing Date': string
  'Description': string
  'Merchant': string
  'Category': string
  'Type': string
  'Amount (USD)': string
  'Purchased By': string
}

export const appleCardStrategy: ImportStrategy = {
  name: 'apple_card',

  canHandle(_filename: string, content: string): boolean {
    const firstLine = content.split('\n')[0] ?? ''
    return APPLE_CARD_HEADERS.every(h => firstLine.includes(h))
  },

  parse(content: string): NormalizedTransaction[] {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as AppleCardRow[]

    return records.map((row) => ({
      transactionDate: row['Transaction Date'],
      clearingDate: row['Clearing Date'] || undefined,
      description: row['Description'],
      merchantName: row['Merchant'] || row['Description'],
      amount: parseFloat(row['Amount (USD)'].replace(/,/g, '')),
      type: row['Type'],
      purchasedBy: row['Purchased By'] || undefined,
      sourceCategory: row['Category'] || undefined,
    }))
  },
}
