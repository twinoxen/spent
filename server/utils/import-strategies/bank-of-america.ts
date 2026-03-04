import { parse } from 'csv-parse/sync'
import type { ImportStrategy, NormalizedTransaction } from './types'

// Bank of America credit card and checking CSV exports.
// Credit card export: "Posted Date","Reference Number","Payee","Address","Amount"
// Checking export:    "Date","Description","Amount","Running Bal."
const BOA_CREDIT_HEADERS = ['Posted Date', 'Reference Number', 'Payee', 'Address', 'Amount']
const BOA_CHECKING_HEADERS = ['Date', 'Description', 'Amount', 'Running Bal.']

interface BoaCreditRow {
  'Posted Date': string
  'Reference Number': string
  'Payee': string
  'Address': string
  'Amount': string
}

interface BoaCheckingRow {
  'Date': string
  'Description': string
  'Amount': string
  'Running Bal.': string
}

function parseBofADate(date: string): string {
  // BofA exports MM/DD/YYYY
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (match) return `${match[3]}-${match[1]}-${match[2]}`
  return date
}

function isCredit(amount: number): boolean {
  return amount >= 0
}

export const bankOfAmericaStrategy: ImportStrategy = {
  name: 'bank_of_america',

  canHandle(_filename: string, content: string): boolean {
    const firstLine = content.split('\n')[0] ?? ''
    return (
      BOA_CREDIT_HEADERS.every(h => firstLine.includes(h))
      || BOA_CHECKING_HEADERS.every(h => firstLine.includes(h))
    )
  },

  parse(content: string): NormalizedTransaction[] {
    const firstLine = content.split('\n')[0] ?? ''
    const isCreditCard = BOA_CREDIT_HEADERS.every(h => firstLine.includes(h))

    if (isCreditCard) {
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as BoaCreditRow[]

      return records.map((row) => {
        // BofA credit card: negative amounts are charges, positive are credits/payments
        const amount = parseFloat(row['Amount'].replace(/,/g, ''))
        const normalized = isNaN(amount) ? 0 : amount
        const type = isCredit(normalized) ? 'Credit' : 'Purchase'

        return {
          transactionDate: parseBofADate(row['Posted Date']),
          description: row['Payee'],
          merchantName: row['Payee'],
          amount: normalized,
          type,
        }
      })
    }

    // Checking account format
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as BoaCheckingRow[]

    return records.map((row) => {
      const amount = parseFloat(row['Amount'].replace(/,/g, ''))
      const normalized = isNaN(amount) ? 0 : amount
      const type = isCredit(normalized) ? 'Credit' : 'Purchase'

      return {
        transactionDate: parseBofADate(row['Date']),
        description: row['Description'],
        merchantName: row['Description'],
        amount: normalized,
        type,
      }
    })
  },
}
