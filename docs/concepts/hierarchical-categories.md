---
type: concept
status: active
updated: 2026-04-12
---

# Hierarchical Categories

## What

Categories have an optional `parentId` field (self-referencing foreign key). This enables trees:

```
Food & Dining
├── Restaurants
├── Coffee Shops
└── Groceries

Transportation
├── Ride Share
├── Gas
└── Parking
```

## Why

Flat categories force a bad choice between:
- **Too broad**: "Food" groups everything from a $3 coffee to a $120 dinner
- **Too granular**: 50+ micro-categories become unwieldy

Hierarchical categories let users:
- **Drill down** for detail: "Where did I spend on groceries?"
- **Roll up** for overview: "Total Food & Dining"
- **See both**: Dashboard charts can toggle between top-level or subcategory breakdowns

## Implementation

**Data model:**
- `categories.parentId`: references `categories.id` (nullable)
- `categories.sortOrder`: numeric field for user-controlled ordering within a level

**API:**
- `GET /api/categories` builds the tree at query time by fetching all user categories and nesting children under parents
- Returns hierarchical JSON structure

**Frontend:**
- `app/components/CategorySelect.vue` renders collapsible category picker
- `app/components/CategorySelectNode.vue` handles recursive tree rendering
- Users can expand/collapse nodes and select at any level

## Sorting

Each category has a `sortOrder` field. Children are sorted by this field within their parent, allowing users to customize category order through the UI.

## Related

- [Categorization System](../architecture/categorization-system.md)
- [Merchant Normalization](merchant-normalization.md)
- [Import Strategy Pattern](../decisions/import-strategy-pattern.md)
