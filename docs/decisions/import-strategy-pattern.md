---
type: decision
status: active
updated: 2026-04-12
---

# Import Strategy Pattern for CSV/PDF Parsing

## Decision

Use a pluggable strategy pattern for CSV/PDF import parsing with automatic format detection.

## Context

Banks export transaction data in wildly different formats:

- **Apple Card**: specific CSV structure with Apple-style date formatting
- **Chase**: columns like "Transaction Date", "Post Date", "Description", "Category"
- **Bank of America**: different column order and naming
- **Mint**: custom CSV with its own schema
- **Coinbase**: crypto-specific transaction format

Asking users to manually map columns or choose formats creates friction.

## Solution

**Strategy-based architecture:**

1. Each bank format lives in its own file: `server/utils/import-strategies/`
   - `apple-card.ts`
   - `chase.ts`
   - `bank-of-america.ts`
   - etc.

2. **`detectStrategy()`** examines filename and CSV headers to pick the right parser automatically

3. **All strategies output** a common `NormalizedTransaction` interface:
   ```typescript
   interface NormalizedTransaction {
     transactionDate: Date
     description: string
     amount: number
     purchasedBy?: string
     // ... other normalized fields
   }
   ```

4. **LLM-powered fallback** for unknown formats (using Claude to infer structure)

## Tradeoffs

**Pros:**
- Each strategy is self-contained and testable
- Adding a new bank is just adding a new file
- Transparent to users (no manual mapping)

**Cons:**
- More files to maintain
- Strategy detection can occasionally guess wrong
- Fallback LLM adds latency for unknown formats

## Alternatives Considered

| Option | Why Rejected |
|--------|-------------|
| Single parser with configuration | Too rigid; can't handle structural variations |
| User-configured column mapping | Bad UX; requires manual work each import |
| Only LLM-based parsing | Slower, less reliable for well-known formats |

## Related

- [Transaction Fingerprinting](../concepts/transaction-fingerprinting.md)
- [Import Pipeline](../architecture/import-pipeline.md)
- [Dual Database Driver](dual-database-driver.md)
