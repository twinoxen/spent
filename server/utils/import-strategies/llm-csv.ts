import OpenAI from 'openai'
import type { NormalizedTransaction } from './types'

// Limit the sample sent to the LLM to keep token usage low.
// Most CSVs have headers + data that fits well within this.
const MAX_SAMPLE_ROWS = 30
const MAX_TEXT_CHARS = 20_000

interface LLMTransaction {
  transactionDate: string
  clearingDate?: string | null
  description: string
  merchantName: string
  amount: number
  type: string
}

/**
 * Extract a representative sample from a CSV string: the header row plus
 * up to MAX_SAMPLE_ROWS data rows. This keeps LLM token usage predictable
 * regardless of how large the uploaded file is.
 */
function buildCsvSample(content: string): string {
  const lines = content.split('\n').filter(l => l.trim().length > 0)
  const sample = lines.slice(0, MAX_SAMPLE_ROWS + 1).join('\n')
  return sample.length > MAX_TEXT_CHARS ? sample.slice(0, MAX_TEXT_CHARS) : sample
}

/**
 * Parse an unrecognized CSV file using GPT-4o-mini. The LLM infers the column
 * mapping from the header row and a sample of data rows, then returns a
 * structured NormalizedTransaction array.
 *
 * This is the catch-all fallback when no built-in strategy matches the file.
 */
export async function parseCsvWithLLM(
  content: string,
  openaiApiKey: string,
): Promise<NormalizedTransaction[]> {
  if (!openaiApiKey) {
    throw new Error(
      'An OpenAI API key is required to parse unrecognized CSV formats. '
      + 'Please add OPENAI_API_KEY to your .env file.',
    )
  }

  const client = new OpenAI({ apiKey: openaiApiKey })
  const sample = buildCsvSample(content)

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a financial data extractor. You will receive a sample from an unknown bank or financial institution's CSV export. Infer which columns correspond to transaction date, description, merchant name, amount, and transaction type.

Return a JSON object with a "transactions" array containing ALL rows from the sample (excluding the header row):
{
  "transactions": [
    {
      "transactionDate": "YYYY-MM-DD",
      "clearingDate": "YYYY-MM-DD or null",
      "description": "full transaction description as shown",
      "merchantName": "clean normalized merchant name",
      "amount": -12.34,
      "type": "Purchase"
    }
  ]
}

Rules:
- amount: NEGATIVE for money leaving the account (purchases, fees, payments, outgoing transfers) and POSITIVE for money coming in (refunds, credits, deposits, income)
- type: "Purchase" for debits/charges, "Payment" for payments to the account, "Credit" for refunds/credits, "Fee" for fees, "Transfer" for transfers
- transactionDate: YYYY-MM-DD only; infer year if only partial date is given
- merchantName: clean and human-readable (e.g. "AMZN MKTP US*AB1CD" → "Amazon")
- If a "clearing date" or "post date" column exists, include it; otherwise omit
- Return ONLY the JSON object, no prose`,
      },
      {
        role: 'user',
        content: `Parse all transactions from this CSV sample:\n\n${sample}`,
      },
    ],
  })

  const responseContent = response.choices[0]?.message?.content
  if (!responseContent) {
    throw new Error('LLM returned an empty response when parsing the CSV.')
  }

  let parsed: { transactions?: LLMTransaction[] }
  try {
    parsed = JSON.parse(responseContent) as { transactions?: LLMTransaction[] }
  } catch {
    throw new Error('LLM returned invalid JSON when parsing CSV transactions.')
  }

  if (!Array.isArray(parsed.transactions)) {
    throw new Error('LLM returned an unexpected structure when parsing CSV transactions.')
  }

  // Now apply the LLM-inferred mapping to the full file, not just the sample.
  // We re-ask the LLM only if the file is larger than the sample; for small
  // files the sample already covers everything.
  const fullLines = content.split('\n').filter(l => l.trim().length > 0)
  const sampleLines = sample.split('\n').filter(l => l.trim().length > 0)
  const hasMoreRows = fullLines.length > sampleLines.length

  if (!hasMoreRows) {
    return parsed.transactions.map(normalizeTransaction)
  }

  // For larger files, we have the header + schema from the sample. Ask the LLM
  // to parse the remaining rows using the same mapping in batches if needed.
  const BATCH_SIZE = 100
  const headerLine = fullLines[0]!
  const dataLines = fullLines.slice(1)
  const allTransactions: NormalizedTransaction[] = parsed.transactions.map(normalizeTransaction)

  // Skip rows already processed in the sample
  const alreadyProcessed = sampleLines.length - 1
  const remainingLines = dataLines.slice(alreadyProcessed)

  for (let i = 0; i < remainingLines.length; i += BATCH_SIZE) {
    const batch = remainingLines.slice(i, i + BATCH_SIZE)
    const batchCsv = [headerLine, ...batch].join('\n')

    const batchResponse = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a financial data extractor. Parse the CSV rows below using the same column mapping you've already identified. Return JSON with a "transactions" array using the same schema as before (transactionDate YYYY-MM-DD, description, merchantName, signed amount, type). Return ONLY the JSON object.`,
        },
        {
          role: 'user',
          content: `Parse all transactions:\n\n${batchCsv}`,
        },
      ],
    })

    const batchContent = batchResponse.choices[0]?.message?.content
    if (!batchContent) continue

    let batchParsed: { transactions?: LLMTransaction[] }
    try {
      batchParsed = JSON.parse(batchContent) as { transactions?: LLMTransaction[] }
    } catch {
      continue
    }

    if (Array.isArray(batchParsed.transactions)) {
      allTransactions.push(...batchParsed.transactions.map(normalizeTransaction))
    }
  }

  return allTransactions
}

function normalizeTransaction(t: LLMTransaction): NormalizedTransaction {
  return {
    transactionDate: t.transactionDate,
    clearingDate: t.clearingDate ?? undefined,
    description: t.description,
    merchantName: t.merchantName || t.description,
    amount: typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)),
    type: t.type || 'Purchase',
  }
}
