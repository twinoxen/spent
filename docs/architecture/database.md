---
type: architecture
status: current
updated: 2026-04-12
---

# Database

Spent uses **Drizzle ORM** with **PostgreSQL** as the primary data store. The schema is defined in `server/db/schema.ts` and migrations are auto-run on server startup.

## Schema Overview

**Core Tables:**
- `users` — user accounts (email, password hash, JWT refresh token)
- `accounts` — checking, savings, credit cards (balance, credit limit, APR)
- `categories` — spending categories (hierarchical: `parentId` self-reference)
- `merchants` — normalized merchant names with `rawNames` JSONB array
- `transactions` — line items (date, amount, category, merchant, `fingerprint` for dedup)

**Import & Categorization:**
- `importSessions` — temporary staging for imports (status: pending/approved/rejected)
- `merchantRules` — auto-categorization rules (pattern, category, priority)

**Other:**
- `bills` — recurring payment reminders (amount, due date, occurrence)
- `apiTokens` — API keys for external integrations
- `oauthCodes` — OAuth flow state (for third-party auth)

## Dual-Driver Strategy

The app detects whether it's running on Neon (cloud) or locally:

**Neon (Production on Vercel)**
```typescript
if (databaseUrl.includes('.neon.')) {
  // Use HTTP driver for serverless
  drizzle(neon(databaseUrl))
}
```

**Local Development**
```typescript
// Use node-postgres with connection pooling
drizzle(new Pool({ connectionString: databaseUrl }))
```

This allows serverless deployment without managing persistent connections.

## Migrations

Migrations live in `server/db/migrations/` as SQL files. The `server/plugins/migrations.ts` plugin auto-runs pending migrations on every server start. Drizzle config in `drizzle.config.ts` specifies the schema and migration paths.

## Key Features

- **Fingerprinting** — transactions deduplicated via hash of (date, amount, merchant)
- **JSONB Support** — merchants store array of raw names from imports
- **Hierarchical Categories** — parent-child via `parentId` self-reference
- **Soft Deletes** — some tables use `deletedAt` timestamp instead of hard delete

## Configuration

Config in `drizzle.config.ts`:
```typescript
{
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql'
}
```

Environment: `DATABASE_URL` must point to Neon instance or local PostgreSQL.
