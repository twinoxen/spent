/**
 * One-time migration: convert MM/DD/YYYY stored dates to YYYY-MM-DD
 * and recompute fingerprints for all affected rows.
 *
 * Run with: node scripts/migrate-dates-to-iso.mjs
 * Requires DATABASE_URL (or STORAGE_DATABASE_URL).
 */

import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { config } from 'dotenv'

config()

function mmddyyyyToIso(date) {
  const match = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  return `${match[3]}-${match[1]}-${match[2]}`
}

function generateFingerprint(transactionDate, description, amount, purchasedBy) {
  const data = `${transactionDate}|${description}|${amount}|${purchasedBy}`
  const hash = sha256(new TextEncoder().encode(data))
  return bytesToHex(hash)
}

async function run() {
  const databaseUrl = process.env.STORAGE_DATABASE_URL ?? process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL (or STORAGE_DATABASE_URL) is required.')
  }

  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(databaseUrl)
  const query = async (text, params) => ({ rows: await sql.query(text, params) })

  console.log('Using Postgres via DATABASE_URL/STORAGE_DATABASE_URL.')

  const { rows: txns } = await query(
    `SELECT id, transaction_date, clearing_date, description, amount, purchased_by
     FROM transactions
     WHERE transaction_date ~ '^\\d{2}/\\d{2}/\\d{4}$'`
  )

  console.log(`Found ${txns.length} transactions to migrate.`)

  let txnUpdated = 0
  for (const row of txns) {
    const isoDate = mmddyyyyToIso(row.transaction_date)
    if (!isoDate) {
      console.warn(`  Skipping id=${row.id}: could not parse "${row.transaction_date}"`)
      continue
    }
    const isoClearing = row.clearing_date ? mmddyyyyToIso(row.clearing_date) : null
    const newFingerprint = generateFingerprint(
      isoDate,
      row.description,
      Number(row.amount),
      row.purchased_by ?? '',
    )

    await query(
      `UPDATE transactions
       SET transaction_date = $1,
           clearing_date    = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE clearing_date END,
           fingerprint      = $3
       WHERE id = $4`,
      [isoDate, isoClearing, newFingerprint, row.id],
    )
    txnUpdated++
  }
  console.log(`  Updated ${txnUpdated} transactions.`)

  const { rows: staged } = await query(
    `SELECT id, transaction_date, clearing_date, description, amount, purchased_by
     FROM staging_transactions
     WHERE transaction_date ~ '^\\d{2}/\\d{2}/\\d{4}$'`
  )

  console.log(`Found ${staged.length} staging_transactions to migrate.`)

  let stagedUpdated = 0
  for (const row of staged) {
    const isoDate = mmddyyyyToIso(row.transaction_date)
    if (!isoDate) {
      console.warn(`  Skipping staging id=${row.id}: could not parse "${row.transaction_date}"`)
      continue
    }
    const isoClearing = row.clearing_date ? mmddyyyyToIso(row.clearing_date) : null
    const newFingerprint = generateFingerprint(
      isoDate,
      row.description,
      Number(row.amount),
      row.purchased_by ?? '',
    )

    await query(
      `UPDATE staging_transactions
       SET transaction_date = $1,
           clearing_date    = CASE WHEN $2::text IS NOT NULL THEN $2::text ELSE clearing_date END,
           fingerprint      = $3
       WHERE id = $4`,
      [isoDate, isoClearing, newFingerprint, row.id],
    )
    stagedUpdated++
  }
  console.log(`  Updated ${stagedUpdated} staging_transactions.`)

  console.log('Migration complete.')
}

run().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
