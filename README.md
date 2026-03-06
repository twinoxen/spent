# Spent

Finance visualization app built with Nuxt 4 + Drizzle on Postgres.

## Database strategy

- **Local dev:** Docker Postgres (`docker-compose.yml`) with persistent `pgdata` volume.
- **Production:** Neon Postgres via `DATABASE_URL` (or `STORAGE_DATABASE_URL`).
- **No local file DB fallback:** app and migrations now require a Postgres URL in all environments.

## Prerequisites

- Node.js 20+
- Docker + Docker Compose

## Local setup

1. Install deps:

```bash
npm ci
```

2. Copy env file and set DB URL (default below matches compose):

```bash
cp .env.example .env.local
# DATABASE_URL=postgresql://spent:spent@localhost:5432/spent
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
npm run db:up           # start postgres container
npm run db:down         # stop containers
npm run db:migrate      # apply drizzle migrations (requires DATABASE_URL)
npm run db:reset-local  # reset local postgres volume
npm run db:reset        # reset local db + run migrations
```

## CI

Pull request CI (`.github/workflows/ci.yml`) runs:

1. Postgres service container
2. `npm ci`
3. `npm run db:migrate`
4. `npm test`
5. `npm run build`

## Notes

- `DATABASE_URL` (or `STORAGE_DATABASE_URL`) is required for runtime and migrations.
- `STORAGE_DATABASE_URL` takes precedence when both are set.
