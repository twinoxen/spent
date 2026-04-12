---
type: architecture
status: current
updated: 2026-04-12
---

# MCP Server Integration

Spent exposes a **Model Context Protocol (MCP) server** at the `/api/mcp` endpoint. This allows external AI agents (Claude, other LLMs, or automation systems) to interact with Spent's data and operations programmatically.

## What Is MCP?

MCP is a protocol that defines how LLMs and external tools communicate. A Spent MCP server exposes **tools** that AI agents can call. Each tool has:
- Name and description
- Input schema (Zod validation)
- Implementation logic

## Available Tools

The MCP server at `/api/mcp` exposes these tool categories:

### Account Management
- `list_accounts` — all accounts with balances and credit utilization
- `create_account` — new checking, savings, credit card, or investment account
- `update_account` — modify balance, APR, credit limit
- `delete_account` — remove account and all transactions

### Transaction Management
- `list_transactions` — query by date range, category, account, or search
- `create_transaction` — manual transaction entry
- `update_transaction` — modify amount, category, date, merchant
- `delete_transaction` — remove a transaction
- `export_transactions_csv` — export to CSV

### Category & Merchant
- `list_categories` — all categories with hierarchy
- `create_category` — new category (with optional parent)
- `update_category` — rename, recolor, reorganize
- `delete_category` — remove category
- `list_merchants` — all merchants with raw name variants
- `merge_merchants` — combine duplicate merchants

### Merchant Rules & Auto-Categorization
- `list_merchant_rules` — all auto-categorization rules
- `create_merchant_rule` — new pattern-to-category mapping
- `delete_merchant_rule` — remove a rule
- `auto_categorize_transactions` — run categorization on uncategorized txns
- `suggest_categories` — AI analysis of uncategorized txns, suggest new categories
- `apply_category_suggestions` — create categories and rules from suggestions

### Bills
- `list_bills` — all bill reminders
- `create_bill` — new recurring or one-time bill
- `update_bill` — modify amount, due date, frequency
- `delete_bill` — remove bill

### Analytics
- `get_spending_stats` — totals and category breakdown for date range
- `get_daily_spending` — per-day spending totals

## Implementation

The MCP server implementation is in `server/api/mcp.ts` (or similar). It:

1. Handles POST requests with tool invocations
2. Parses the request (tool name, input params)
3. Validates input with Zod schemas
4. Calls the appropriate handler (reuses business logic from regular API)
5. Returns result or error

All tools are **authenticated** — the request must include a valid JWT token (same as frontend users) or use an `API-Token` header with an API key from `apiTokens` table.

## Calling from Claude

When Claude (or another LLM) has access to the Spent MCP server:

```javascript
// Claude can call:
const accounts = await mcp.callTool('list_accounts', {})

// Create a category:
await mcp.callTool('create_category', {
  name: 'Entertainment',
  icon: '🎬',
  color: '#FF6B6B'
})

// Auto-categorize and suggest new categories:
const suggestions = await mcp.callTool('suggest_categories', {})
await mcp.callTool('apply_category_suggestions', {
  approved: suggestions
})
```

## API Tokens

For non-browser clients (APIs, cron jobs, external tools), create an API token:

1. Users can generate tokens in settings
2. Tokens are stored in `apiTokens` table with a user_id
3. Pass token via `Authorization: Bearer <token>` header
4. Global auth middleware accepts both JWT cookies and bearer tokens

## Key Files

- `server/api/mcp.ts` — main MCP endpoint implementation
- `server/utils/mcp-tools/` — individual tool implementations (optional)
- Schema: `apiTokens` table in `server/db/schema.ts`
