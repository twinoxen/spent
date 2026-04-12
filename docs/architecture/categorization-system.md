---
type: architecture
status: current
updated: 2026-04-12
---

# Categorization System

Spent uses a **three-tier categorization strategy** to assign transactions to categories. Higher tiers are tried first; fallback to the next tier if no match.

## Tier 1: Merchant Rules (Highest Priority)

Rules in the `merchantRules` table match merchant names with regex patterns. Each rule has:
- `pattern` — case-insensitive substring to match
- `categoryId` — category to assign
- `priority` — higher priority rules match first (default 100)
- `merchantId` — optional; limits rule to a specific merchant

Rules are evaluated in `server/utils/categorizer.ts` using `matchMerchantRule()`. User corrections create new rules, so the system learns over time.

## Tier 2: Source Hints

Some import formats include category data (e.g., Apple Card's Category column). These are stored on the transaction during import and checked before falling back to AI.

## Tier 3: AI Fallback (Lowest Priority)

For transactions without a merchant rule or source hint, call `server/utils/llmCategorizer.ts`. It sends the merchant name and optional description to OpenAI API and requests a category ID.

The LLM categorizer:
- Uses the current category list as a prompt hint
- Returns the category ID most likely to match
- Logs failures for review (uncategorized transactions)

## Hierarchical Categories

Categories can have a parent category (self-referencing `parentId` in the schema). This enables:
- Top-level: `Food`, `Transport`, `Utilities`, etc.
- Sub-level: `Food > Restaurants`, `Food > Groceries`

The API and UI can filter by parent or show full hierarchy.

## Learning Loop

When a user manually corrects a transaction's category, the system can create or update a merchant rule. For example:

1. Transaction from "Starbucks" incorrectly categorized as "Work"
2. User changes it to "Food > Coffee"
3. System creates a rule: pattern="starbucks", categoryId=<Food_Coffee_ID>, priority=110

Over time, rules improve auto-categorization accuracy.

## Key Files

- `server/utils/categorizer.ts` — rule matching and tier orchestration
- `server/utils/llmCategorizer.ts` — OpenAI integration
- Schema: `categories`, `merchantRules`, `merchants` tables
- API: `/api/categorize` endpoint for manual categorization
