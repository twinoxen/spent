# Spent

Finance visualization app built with Nuxt 4 + Drizzle on Postgres.

## Database strategy

- **Local dev:** Docker Postgres (`docker-compose.yml`) with persistent `pgdata` volume.
- **Production:** Neon Postgres via `STORAGE_DATABASE_URL`.
- **No local file DB fallback:** app and migrations now require a Postgres URL in all environments.

## Prerequisites

- Node.js 20+
- Docker + Docker Compose

## Local setup

1. Install deps:

```bash
npm ci
```

2. Copy env file and set `STORAGE_DATABASE_URL` (default below matches compose):

```bash
cp .env.example .env.local
# STORAGE_DATABASE_URL=postgresql://spent:spent@localhost:5432/spent
```

3. Start local Postgres:

```bash
npm run db:up
```

4. Run migrations:

```bash
npm run db:migrate
# or: scripts/dev-db-migrate.sh
```

5. Run app:

```bash
npm run dev
```

## DB scripts

```bash
npm run db:up           # start postgres container and wait until healthy
npm run db:down         # stop containers
npm run db:migrate      # apply drizzle migrations (requires STORAGE_DATABASE_URL)
npm run db:reset-local  # reset local postgres volume and wait until healthy
npm run db:reset        # reset local db + run migrations
```

## E2E tests (Playwright)

Run end-to-end tests locally:

```bash
npx playwright test
```

What the smoke E2E covers:

- register/login flow
- create account
- create transaction
- account appears on `/accounts`
- transaction appears on `/transactions`
- MCP `list_accounts` tool call on `/api/mcp` returns non-error

The suite is hermetic: it creates a unique email per run and only minimal data needed for the test.

## CI

Pull request CI (`.github/workflows/ci.yml`) runs:

1. **unit-build** job
   1. Postgres service container
   2. `npm ci`
   3. `npm run db:migrate`
   4. `npm test`
   5. `npm run build`
2. **e2e** job (runs after unit-build)
   1. Postgres service container
   2. `npm ci`
   3. `npx playwright install --with-deps chromium`
   4. `npx playwright test` (with webServer auto-start)

## Notes

- `STORAGE_DATABASE_URL` is required for runtime and migrations in all environments.

## Vercel environment variables

- Set `STORAGE_DATABASE_URL` in Production/Preview/Development as needed.
- Remove any legacy DB URL env vars from the project to avoid stale or conflicting configuration.
- If you use Neon + Vercel integration, map the integration output value into `STORAGE_DATABASE_URL`.
