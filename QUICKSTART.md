# Quickstart (Docker Postgres + Neon-ready)

## 1) Start local Postgres

```bash
npm run db:up
```

## 2) Configure env

```bash
cp .env.example .env.local
```

Ensure `.env.local` contains:

```bash
STORAGE_DATABASE_URL=postgresql://spent:spent@localhost:5432/spent
```

(`STORAGE_DATABASE_URL` is required.)

## 3) Run migrations

```bash
npm run db:migrate
```

## 4) Start app

```bash
npm run dev
```

## Reset local DB (destructive)

```bash
npm run db:reset-local
npm run db:migrate
```

## Production

Use Neon Postgres and set `STORAGE_DATABASE_URL` in your deployment environment.
