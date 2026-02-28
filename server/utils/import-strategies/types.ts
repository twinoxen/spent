export interface NormalizedTransaction {
  transactionDate: string
  clearingDate?: string
  description: string
  merchantName: string
  amount: number
  type: string
  purchasedBy?: string
  sourceCategory?: string
}

export interface ImportStrategy {
  readonly name: string
  canHandle(filename: string, content: string): boolean
  parse(content: string): NormalizedTransaction[]
}
