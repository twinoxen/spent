---
type: concept
status: active
updated: 2026-04-12
---

# Merchant Normalization

## What

Raw transaction descriptions from bank statements are messy. Spent maps them to canonical merchant names:

```
"APPLE.COM/BILL 800-692-7753 CA" → "Apple"
"STARBUCKS #12345 SAN FRANCISCO CA" → "Starbucks"
"WHOLE FOODS MKT #10234" → "Whole Foods Market"
```

The `merchants` table stores:
- `normalizedName`: "Apple", "Starbucks", etc.
- `rawNames`: JSONB array of all variants seen in imports

## Why

Clean merchant names enable:

- **Meaningful grouping**: All Apple transactions together
- **Reporting**: "Spending on groceries" rolls up Whole Foods, Trader Joe's, Safeway
- **Auto-categorization**: Rules like "Starbucks → Coffee & Tea" apply consistently
- **User experience**: Cleaner transaction list, searchable merchants

Without normalization, "STARBUCKS #12345" and "STARBUCKS STORE 678" would be separate entities.

## Learning Loop

When a user:
1. Categorizes a transaction, or
2. Corrects a merchant name

The system can create a merchant rule. Future imports with matching descriptions are auto-categorized without user intervention.

## Implementation

- Normalization happens during import via the [Import Strategy Pattern](../decisions/import-strategy-pattern.md)
- LLM-assisted fallback for unknown merchants
- User can manually merge merchants in the UI

## Related

- [Categorization System](../architecture/categorization-system.md)
- [Hierarchical Categories](hierarchical-categories.md)
- [Import Strategy Pattern](../decisions/import-strategy-pattern.md)
