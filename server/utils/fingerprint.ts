import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

export function generateFingerprint(
  transactionDate: string,
  description: string,
  amount: number,
  purchasedBy: string
): string {
  const data = `${transactionDate}|${description}|${amount}|${purchasedBy}`
  const hash = sha256(new TextEncoder().encode(data))
  return bytesToHex(hash)
}
