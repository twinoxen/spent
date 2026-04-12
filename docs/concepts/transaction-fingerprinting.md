---
type: concept
status: active
updated: 2026-04-12
---

# Transaction Fingerprinting for Deduplication

## What

Each transaction receives a SHA-256 fingerprint hash computed from:
```
(transactionDate, description, amount, purchasedBy)
```

Implemented in `server/utils/fingerprint.ts`.

## Why

Users regularly import overlapping statement periods (e.g., "March 1–31" followed by "March 15–April 15"). Without deduplication, the same transaction appears multiple times in the ledger.

Fingerprinting detects cross-import duplicates while preserving legitimate same-day, same-amount transactions that have different descriptions (e.g., two $5 Starbucks purchases at different locations).

## How It Works

**On import commit:**

1. Compute fingerprints for all staged transactions
2. Query existing transactions in the same account for matching fingerprints
3. Flag duplicates for user review (rather than silently dropping them)
4. User can choose to:
   - Skip the duplicate
   - Import it anyway (if it's legitimately different)
   - Merge/link the transactions

**Fingerprint collisions:**

- Very rare: same date, same merchant name, exact amount, same purchaser
- User review step prevents accidental loss of legitimate transactions

## Implementation Details

- Fingerprints are stored in the database for quick lookup
- Recomputed at import time (no pre-computed hash on upload)
- Uses Node's `crypto.createHash('sha256')`

## Related

- [Import Strategy Pattern](../decisions/import-strategy-pattern.md)
- [Import Pipeline](../architecture/import-pipeline.md)
- [Merchant Normalization](merchant-normalization.md)
