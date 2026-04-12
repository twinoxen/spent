# Spent — Wiki Schema

This is a persistent, LLM-maintained knowledge base for the Spent project. Knowledge is compiled once and kept current, not re-derived on every query.

**Division of labor:** The human curates sources, directs analysis, and asks good questions. The LLM summarizes, cross-references, files, and does the bookkeeping that makes a knowledge base useful over time.

**This schema is a living document.** Update it as we learn what works for this domain.

## Core Rules

1. **Check `inbox/` first** — if files are there, they need processing before anything else.
2. **`raw/` is permanent archive** — immutable once filed. Never modify originals.
3. **Wiki pages are synthesized knowledge** — summarize, connect, analyze. Don't just copy source material.
4. **Prefer updating existing pages** over creating new ones. A page that grows richer is more valuable than many thin pages.
5. **Preserve uncertainty** — note conflicts and open questions explicitly rather than picking winners.
6. **Cross-reference generously** — use relative markdown links (`[Transaction Fingerprinting](concepts/transaction-fingerprinting.md)`).
7. **Good query answers should be filed back** as wiki pages when they contain lasting value.

## Directory Layout

```
docs/
├── AGENTS.md          ← this file (wiki schema)
├── index.md           ← content catalog, organized by category
├── log.md             ← chronological record of wiki operations
├── inbox/             ← drop zone for new material to be processed
├── raw/               ← permanent archive of original sources (immutable)
├── sources/           ← summaries of ingested sources
├── architecture/      ← system design, module overviews, data flow
├── decisions/         ← design decisions with rationale and tradeoffs
├── concepts/          ← domain concepts (categorization, deduplication, etc.)
└── meta/              ← wiki health, style notes, process refinements
```

### Directory Purposes

- **inbox/** — Drop files here for processing. Articles, notes, design sketches, feature specs, anything. The LLM reads from here during ingest and moves originals to `raw/`.
- **raw/** — Permanent archive. Once a source is filed here, it is never modified. This is the source of truth for "what was the original material."
- **sources/** — One page per ingested source. Contains a summary, key takeaways, and links to wiki pages the source informed or updated.
- **architecture/** — How Spent is built. System overview, module breakdowns, data flow diagrams, API surface. The *what* and *how* of the system, complementing the source code (which is ground truth for implementation details).
- **decisions/** — Design decisions with context, alternatives considered, and rationale. Named by topic, not date — e.g., `dual-database-driver.md`, not `2026-01-15-decision.md`. Dates go in frontmatter or the log.
- **concepts/** — Domain concepts that recur across the project. Transaction fingerprinting, hierarchical categories, merchant normalization, import strategies. Each concept gets a page explaining what it is, why it matters, and how Spent implements it.
- **meta/** — Wiki housekeeping. Style guide, process notes, lint findings, retrospectives on what's working.

## Relationship to Codebase

The wiki captures the *why* — design rationale, tradeoffs, context that isn't obvious from reading code. Source code is ground truth for the *what*. They're aware of each other but serve different purposes.

When architecture changes, update or flag relevant wiki pages. When wiki pages reference specific code paths, use relative links or module names (not line numbers, which drift).

## Naming Conventions

- **Directories and filenames:** lowercase, hyphenated. No spaces, no camelCase, no underscores.
  - Good: `architecture/import-pipeline.md`, `concepts/transaction-fingerprinting.md`
  - Bad: `architecture/Import Pipeline.md`, `concepts/TransactionFingerprinting.md`
- **Page titles:** Use natural casing in the `# Heading`, but keep the filename hyphenated.

## Page Conventions

- Concise markdown. Favor clarity over completeness — a useful half-page beats an exhaustive ten-page doc nobody reads.
- Optional YAML frontmatter:
  ```yaml
  ---
  type: architecture | decision | concept | source | meta
  status: draft | current | stale
  updated: 2026-04-12
  ---
  ```
- Cross-link generously using relative paths.
- When referencing code, use module/file names: "see `server/utils/fingerprint.ts`" rather than line numbers.

## Operations

### Ingest

New source arrives in `inbox/` → LLM reads it → creates or updates wiki pages → moves original to `raw/` → updates `index.md` → appends to `log.md`.

A single source might touch many pages. An article about CSV parsing could update `architecture/import-pipeline.md`, create `concepts/csv-strategy-pattern.md`, and add a source page in `sources/`.

### Query

Read `index.md` to find relevant pages → read those pages → synthesize an answer. If the answer contains lasting value (a new connection, a useful analysis), file it as a new wiki page.

### Lint

Periodic health check:
- Broken relative links
- Orphan pages (not linked from index or any other page)
- Index accuracy (all pages listed, descriptions current)
- Naming convention violations
- Stale content (pages marked `current` that reference changed architecture)
- Concepts mentioned in multiple pages but lacking their own dedicated page

## Indexing

`index.md` is the content-oriented catalog. Organized by category (matching subdirectories), each entry has a link and brief description. The LLM reads this first when answering queries to find relevant pages.

## Logging

`log.md` is chronological, append-only. Each entry starts with:

```
## [YYYY-MM-DD] verb | description
```

Verbs: `setup`, `ingest`, `query`, `lint`, `update`, `create`, `bootstrap`. This format is parseable with simple tools.
