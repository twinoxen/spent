---
type: architecture
status: current
updated: 2026-04-12
---

# Import Pipeline

The import system handles CSV, PDF, and image uploads from various financial institutions and formats. It uses a **strategy pattern** to detect and parse different formats, with automatic fallback to LLM-powered parsing for unknown sources.

## Strategy Pattern

Import strategies live in `server/utils/import-strategies/` and implement a common interface. Supported formats:

- **Apple Card** — direct CSV export
- **Chase** — Chase online statement CSV
- **Bank of America** — BoA download format
- **Mint** — legacy Mint export CSV
- **LLM Fallback** — unknown CSVs, PDFs, and images via OpenAI vision

Each strategy exports a `parseStrategy()` function and metadata for format detection.

## Import Flow

```
Upload → detectStrategy() → parse to NormalizedTransaction
    ↓
Staging Session (user review + categorize)
    ↓
Deduplication (fingerprint check)
    ↓
Auto-categorization (optional)
    ↓
User approval → commit to DB
```

### 1. Upload & Detection

The endpoint receives a file. `detectStrategy()` examines filename, MIME type, and content to pick a parser.

### 2. Parse to Standard Form

Each strategy converts its format to `NormalizedTransaction`:
```typescript
{
  date: Date
  description: string
  amount: number
  category?: string  // source hint
  merchant?: string
  notes?: string
}
```

### 3. Staging Session

Transactions are stored in `importSessions` table (not yet committed). Users can:
- Review and filter transactions
- Bulk or per-transaction categorization
- Delete rows they don't want
- Adjust merchant names

### 4. Deduplication

Before commit, check for duplicates using **fingerprints** (hash of date, amount, merchant). Prevent duplicate entries within the same import and vs. existing transactions.

### 5. Auto-Categorization

Optional. Runs categorization logic (see [Categorization System](./categorization-system.md)) on staged transactions. Users see suggested categories before committing.

### 6. Commit

User approves the import. Transactions move from staging to the live `transactions` table, linked to the selected account.

## Key Files

- `server/api/import.post.ts` — main endpoint
- `server/utils/import-strategies/` — format parsers
- `server/utils/parseCSV.ts` — CSV utilities
- Schema: `importSessions` table in `server/db/schema.ts`
