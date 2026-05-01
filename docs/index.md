# Spent — Knowledge Index

Project wiki catalog, organized by category.

## Architecture

- [System Overview](architecture/overview.md) — High-level architecture, tech stack, and how the pieces fit together
- [Import Pipeline](architecture/import-pipeline.md) — CSV/PDF import flow: strategy detection, parsing, staging, deduplication, commit
- [Categorization System](architecture/categorization-system.md) — Three-tier categorization: merchant rules, source hints, AI fallback
- [Database & ORM](architecture/database.md) — Drizzle ORM setup, dual-driver strategy (Neon vs node-postgres), schema overview
- [Authentication & Authorization](architecture/authentication.md) — JWT-based auth, middleware, OAuth flow
- [MCP Server](architecture/mcp-server.md) — Model Context Protocol integration for external AI agents
- [Reserves / Envelopes](architecture/database.md#reserves--envelopes) — Internal cash earmarks that reduce available-to-spend without creating bank transactions

## Decisions

- [Dual Database Driver](decisions/dual-database-driver.md) — Why Spent uses both Neon HTTP and node-postgres drivers
- [Strategy Pattern for Imports](decisions/import-strategy-pattern.md) — Why pluggable import strategies instead of a single parser

## Concepts

- [Transaction Fingerprinting](concepts/transaction-fingerprinting.md) — SHA-256 deduplication across imports
- [Merchant Normalization](concepts/merchant-normalization.md) — Mapping messy descriptions to canonical merchant names
- [Hierarchical Categories](concepts/hierarchical-categories.md) — Parent-child category trees with recursive queries

## Sources
