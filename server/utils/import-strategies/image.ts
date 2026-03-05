import sharp from 'sharp'
import OpenAI from 'openai'
import type { NormalizedTransaction } from './types'

const IMAGE_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  gif: 'image/gif',
}

interface LLMTransaction {
  transactionDate: string
  clearingDate?: string | null
  description: string
  merchantName: string
  amount: number
  type: string
}

/**
 * Normalize the image buffer to JPEG if it is HEIC (iPhone default format),
 * since OpenAI's vision API does not accept HEIC directly.
 * All other formats are passed through unchanged.
 */
async function normalizeImage(buffer: Buffer, ext: string): Promise<{ buffer: Buffer; mimeType: string }> {
  if (ext === 'heic') {
    const converted = await sharp(buffer).jpeg({ quality: 90 }).toBuffer()
    return { buffer: converted, mimeType: 'image/jpeg' }
  }

  const mimeType = IMAGE_MIME_TYPES[ext] ?? 'image/jpeg'
  return { buffer, mimeType }
}

/**
 * Send the image to GPT-4o (vision) and extract structured transactions.
 * GPT-4o is used here instead of gpt-4o-mini for better accuracy on photos
 * and screenshots where layout complexity and image quality can vary.
 */
async function extractTransactionsWithVision(
  buffer: Buffer,
  mimeType: string,
  openaiApiKey: string,
  institution?: string,
): Promise<NormalizedTransaction[]> {
  const client = new OpenAI({ apiKey: openaiApiKey })
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  const institutionHint = institution ? `Institution: ${institution}\n` : ''

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    max_tokens: 4096,
    messages: [
      {
        role: 'system',
        content: `You are a financial data extractor. Extract all individual transactions from a bank or credit card statement image.

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
- amount: use NEGATIVE numbers for money leaving the account (debits, charges, purchases, fees, outgoing transfers, bill payments) and POSITIVE numbers for money entering the account (income, refunds, credits, deposits, incoming transfers)
- type: "Purchase" for charges/debits, "Payment" for payments to the account, "Credit" for refunds/credits, "Fee" for fees, "Transfer" for transfers
- transactionDate: YYYY-MM-DD format only
- merchantName: clean, human-readable (e.g. "AMZN MKTP US*AB1CD" → "Amazon")
- Include ONLY actual line-item transactions — skip opening/closing balances, interest summaries, account headers, and totals
- If the image is blurry, rotated, or partially cropped, extract what you can and omit rows you cannot read with confidence
- Return ONLY the JSON object, no prose`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${institutionHint}Extract all transactions from this bank statement image.`,
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl, detail: 'high' },
          },
        ],
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('GPT-4o returned an empty response when parsing the statement image.')
  }

  let parsed: { transactions?: LLMTransaction[] }
  try {
    parsed = JSON.parse(content) as { transactions?: LLMTransaction[] }
  } catch {
    throw new Error('GPT-4o returned invalid JSON when parsing the statement image.')
  }

  if (!Array.isArray(parsed.transactions)) {
    throw new Error('GPT-4o returned an unexpected structure when parsing the statement image.')
  }

  return parsed.transactions.map((t): NormalizedTransaction => ({
    transactionDate: t.transactionDate,
    clearingDate: t.clearingDate ?? undefined,
    description: t.description,
    merchantName: t.merchantName || t.description,
    amount: typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount)),
    type: t.type || 'Purchase',
    purchasedBy: undefined,
    sourceCategory: undefined,
  }))
}

/**
 * Primary entry point: parse a bank statement image into normalized transactions.
 * Accepts JPG, PNG, WEBP, and HEIC. HEIC is converted to JPEG before the API call.
 * Requires an OpenAI API key with access to GPT-4o.
 */
export async function parseImageStatement(
  buffer: Buffer,
  ext: string,
  openaiApiKey: string,
  institution?: string,
): Promise<NormalizedTransaction[]> {
  if (!openaiApiKey) {
    throw new Error(
      'An OpenAI API key is required to parse image bank statements. ' +
      'Please add OPENAI_API_KEY to your .env file.',
    )
  }

  let normalizedBuffer: Buffer
  let mimeType: string
  try {
    const result = await normalizeImage(buffer, ext.toLowerCase())
    normalizedBuffer = result.buffer
    mimeType = result.mimeType
  } catch (err) {
    throw new Error(`Failed to process the image file: ${err instanceof Error ? err.message : String(err)}`)
  }

  // OpenAI's vision API accepts images up to 20 MB after encoding.
  // Base64 overhead is ~33%, so the raw buffer should be under ~15 MB.
  const MAX_BUFFER_BYTES = 15 * 1024 * 1024
  if (normalizedBuffer.length > MAX_BUFFER_BYTES) {
    throw new Error(
      'The image file is too large to process (limit is ~15 MB after conversion). ' +
      'Try exporting a smaller or more compressed version.',
    )
  }

  return extractTransactionsWithVision(normalizedBuffer, mimeType, openaiApiKey, institution)
}
