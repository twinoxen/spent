# Agent Workflow Guide

This document describes the conventions agents (AI or human) should follow when making changes to this repository.

## Branch Protection

The `main` branch is protected. **All changes must be made via a pull request** — direct pushes to `main` are not allowed. No approvals are required since this is a solo project, but the PR workflow must be followed.

## Branching Workflow

1. **Always create a branch** before making any code changes:
   ```bash
   git checkout -b <branch-name>
   ```

2. **Branch naming conventions:**
   - Features: `feat/<short-description>` (e.g. `feat/export-csv`)
   - Bug fixes: `fix/<short-description>` (e.g. `fix/auth-redirect`)
   - Chores / maintenance: `chore/<short-description>` (e.g. `chore/update-deps`)
   - Refactors: `refactor/<short-description>` (e.g. `refactor/transaction-model`)

3. **Make your changes** on the branch, committing incrementally with clear messages.

4. **Open a pull request** to merge into `main`:
   ```bash
   git push -u origin HEAD
   gh pr create --title "<title>" --body "<description>"
   ```

5. **Merge the PR** once you're satisfied (no reviewer approval is required).

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run dev:fresh` | Reset the database and start the dev server |
| `npm run build` | Build for production |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |
| `npm run db:reset` | Wipe and re-migrate the local SQLite database |

## Stack

- **Framework:** Nuxt 4 (Vue 3)
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **UI:** Nuxt UI + Tailwind CSS 4
- **Auth:** JWT (`jose`) + bcrypt
- **AI:** OpenAI SDK
- **PDF/CSV parsing:** `unpdf`, `csv-parse`

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for AI-assisted categorization |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `GITHUB_TOKEN` | Full-access GitHub PAT for repo management (branch protection, PRs) |
