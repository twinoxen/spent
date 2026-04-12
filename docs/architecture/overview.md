---
type: architecture
status: current
updated: 2026-04-12
---

# System Overview

Spent is a Nuxt 4 full-stack personal finance app. The codebase uses **Nuxt's file-based routing** for both pages and API endpoints, with frontend code in `app/` and backend in `server/`.

## Architecture

**Frontend** (Vue 3 + Tailwind CSS 4)
- Pages in `app/pages/` with file-based routing
- UI components in `app/components/` (Nuxt UI v4)
- Composables in `app/composables/` for state and logic

**Backend** (Nitro + Drizzle ORM)
- API endpoints in `server/api/` with automatic REST routing
- Database layer in `server/db/` (Drizzle ORM + PostgreSQL)
- Utilities and middleware in `server/utils/` and `server/middleware/`

## Deployment

Deployed on **Vercel** with **Neon PostgreSQL**. The app detects Neon URLs and uses the HTTP driver for serverless; locally it uses node-postgres with connection pooling. Migrations auto-run on server start.

## Key Subsystems

- **[Import Pipeline](./import-pipeline.md)** — CSV/PDF import with format detection and staging
- **[Categorization](./categorization-system.md)** — Merchant rules, source hints, AI fallback
- **[Database](./database.md)** — Drizzle schema, dual-driver strategy
- **[Authentication](./authentication.md)** — JWT tokens, password hashing, OAuth
- **[MCP Server](./mcp-server.md)** — AI agent integration via Model Context Protocol

## Configuration

- `nuxt.config.ts` — Nuxt setup (modules, routing, build)
- `drizzle.config.ts` — ORM config (migrations, schema path)
- Environment variables in `.env` (JWT_SECRET, Neon URL, OpenAI key)
