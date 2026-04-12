---
type: decision
status: active
updated: 2026-04-12
---

# Dual Database Driver Strategy

## Decision

Use both Neon HTTP driver and node-postgres depending on environment.

## Context

Spent deploys to Vercel (serverless) but develops locally with Docker Postgres. Serverless functions cannot maintain persistent TCP connections efficiently, but a connection pool works well in local development.

## Solution

`server/db/index.ts` detects the connection URL format:

- **Neon URLs** (containing `*.neon.*`) → Neon HTTP driver
  - Connectionless, optimized for serverless
  - No persistent TCP overhead
  
- **Local/standard Postgres URLs** → node-postgres with connection pool
  - Full SQL compatibility
  - Efficient pooling in containerized dev environment

The detection is automatic based on `STORAGE_DATABASE_URL`. No manual configuration needed.

## Tradeoffs

**Pros:**
- Optimal performance in both environments
- Transparent to developers and application logic
- No environment-specific code branches in business logic

**Cons:**
- Adds complexity (two driver code paths)
- Requires testing both drivers
- Driver differences could surface edge cases

## Alternatives Considered

| Option | Tradeoff |
|--------|----------|
| node-postgres everywhere | Works locally and on Vercel, but suboptimal on serverless (connection overhead) |
| Neon driver everywhere | Excellent on Vercel, but poor experience in local Docker development |

## Related

- [Import Pipeline](../architecture/import-pipeline.md)
- [Import Strategy Pattern](import-strategy-pattern.md)
