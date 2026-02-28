import { extractText } from 'unpdf'
import OpenAI from 'openai'
import type { NormalizedTransaction } from './types'

// Below this character count, the PDF is likely a scanned image rather than digital text.
const MIN_EXTRACTABLE_TEXT_LENGTH = 100

// Prevent runaway token usage — most statements fit well within this limit.
const MAX_TEXT_CHARS = 80_000

interface LLMTransaction {
  transactionDate: string
  clearingDate?: string | null
  description: string
  merchantName: string
  amount: number
  type: string
}

/**
 * Extract plain text from a digitally-generated PDF buffer using unpdf,
 * an ESM-native PDF library from the UnJS/Nuxt ecosystem.
 *
 * Note: Scanned (image-only) PDFs cannot be processed here. Full OCR support
 * could be added in the future using tesseract.js + page rendering,
 * but that requires native canvas bindings. Most bank statement PDFs downloaded
 * directly from a bank's website are digitally generated and work fine here.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })
  return text
}

/**
 * Send extracted statement text to GPT-4o-mini and receive a structured
 * array of transactions. One API call per statement upload.
 */
async function extractTransactionsWithLLM(
  text: string,
  openaiApiKey: string,
  institution?: string,
): Promise<NormalizedTransaction[]> {
  const client = new OpenAI({ apiKey: openaiApiKey })

  const institutionHint = institution ? `Institution: ${institution}\n` : ''
  const truncatedText = text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a financial data extractor. Extract all individual transactions from bank statement text.

Return a JSON object with a "transactions" array:
{
  "transactions": [
    {
      "transactionDate": "YYYY-MM-DD",
      "clearingDate": "YYYY-MM-DD or null",
      "description": "full transaction description as shown in statement",
      "merchantName": "clean normalized merchant name",
      "amount": 12.34,
      "type": "Purchase"
    }
  ]
}

Rules:
- amount: always a positive number regardless of debit/credit
- type: "Purchase" for charges/debits, "Payment" for payments to the account, "Credit" for refunds/credits, "Fee" for fees, "Transfer" for transfers
- transactionDate: YYYY-MM-DD format only
- merchantName: clean, human-readable (e.g. "AMZN MKTP US*AB1CD" → "Amazon")
- Include ONLY actual line-item transactions — skip opening/closing balances, interest summaries, account headers, and totals
- Return ONLY the JSON object, no prose`,
      },
      {
        role: 'user',
        content: `${institutionHint}Extract all transactions from this bank statement:\n\n${truncatedText}`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('LLM returned an empty response when parsing the PDF statement.')
  }

  let parsed: { transactions?: LLMTransaction[] }
  try {
    parsed = JSON.parse(content) as { transactions?: LLMTransaction[] }
  } catch {
    throw new Error('LLM returned invalid JSON when parsing PDF transactions.')
  }

  if (!Array.isArray(parsed.transactions)) {
    throw new Error('LLM returned an unexpected structure when parsing PDF transactions.')
  }

  return parsed.transactions.map((t): NormalizedTransaction => ({
    transactionDate: t.transactionDate,
    clearingDate: t.clearingDate ?? undefined,
    description: t.description,
    merchantName: t.merchantName || t.description,
    amount: typeof t.amount === 'number' ? Math.abs(t.amount) : Math.abs(parseFloat(String(t.amount))),
    type: t.type || 'Purchase',
    purchasedBy: undefined,
    sourceCategory: undefined,
  }))
}

/**
 * Primary entry point: parse a PDF bank statement buffer into normalized transactions.
 * Requires an OpenAI API key for the structuring step.
 */
export async function parsePdfStatement(
  buffer: Buffer,
  openaiApiKey: string,
  institution?: string,
): Promise<NormalizedTransaction[]> {
  if (!openaiApiKey) {
    throw new Error(
      'An OpenAI API key is required to parse PDF bank statements. ' +
      'Please add OPENAI_API_KEY to your .env file.',
    )
  }

  let text: string
  try {
    text = await extractPdfText(buffer)
  } catch (err) {
    throw new Error(`Failed to read the PDF file: ${err instanceof Error ? err.message : String(err)}`)
  }

  if (text.trim().length < MIN_EXTRACTABLE_TEXT_LENGTH) {
    throw new Error(
      'This PDF appears to be a scanned image rather than a digitally-generated document, ' +
      'so its text could not be extracted automatically. ' +
      'Please download your statement directly from your bank\'s website (as a generated PDF), ' +
      'or export it as a CSV file instead.',
    )
  }

  return extractTransactionsWithLLM(text, openaiApiKey, institution)
}
