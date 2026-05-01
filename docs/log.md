## [2026-05-01] update | reserves and availability

- Added database and MCP architecture notes for reserves/envelopes, reserve movements, and available-to-spend calculations.

# Log

## [2026-04-12] setup | wiki initialized

- Created wiki structure at `docs/`
- Layout: project wiki
- Added AGENTS.md (schema), index.md, log.md
- Created inbox/, raw/, sources/, architecture/, decisions/, concepts/, meta/

## [2026-04-12] bootstrap | initial pages from codebase

- Created architecture/overview.md — system overview
- Created architecture/import-pipeline.md — import flow
- Created architecture/categorization-system.md — three-tier categorization
- Created architecture/database.md — Drizzle ORM and dual-driver setup
- Created architecture/authentication.md — JWT auth system
- Created architecture/mcp-server.md — MCP integration
- Created decisions/dual-database-driver.md — Neon vs node-postgres rationale
- Created decisions/import-strategy-pattern.md — pluggable import strategy rationale
- Created concepts/transaction-fingerprinting.md — SHA-256 deduplication
- Created concepts/merchant-normalization.md — merchant name canonicalization
- Created concepts/hierarchical-categories.md — category tree structure
- Updated index.md with all bootstrap pages
- Updated root AGENTS.md with pointer to wiki
