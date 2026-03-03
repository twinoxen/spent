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

    // Types that represent money coming in (credits, payments, cashback)
    const CREDIT_TYPES = new Set(['Payment', 'Credit', 'Adjustment'])

    return records.map((row) => {
      const rawAmount = Math.abs(parseFloat(row['Amount (USD)'].replace(/,/g, '')))
      const isCredit = CREDIT_TYPES.has(row['Type'])
      return {
        transactionDate: row['Transaction Date'],
        clearingDate: row['Clearing Date'] || undefined,
        description: row['Description'],
        merchantName: row['Merchant'] || row['Description'],
        // Credits/payments → positive (income); purchases/fees → negative (expense)
        amount: isCredit ? rawAmount : -rawAmount,
        type: row['Type'],
        purchasedBy: row['Purchased By'] || undefined,
        sourceCategory: row['Category'] || undefined,
      }
    })
  },
}
