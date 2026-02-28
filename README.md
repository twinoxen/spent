# Finance Visualizer

A local-first finance visualization app built with Nuxt 4, SQLite, and Drizzle ORM. Import your Apple Card transaction CSVs, automatically categorize spending, and visualize where your money goes.

## Features

- 📊 **Visual Dashboard** - Spending charts by category, over time, top merchants, and per-person breakdowns
- 📥 **CSV Import** - Drag-and-drop Apple Card transaction CSV files with intelligent deduplication
- 🏷️ **Auto-Categorization** - Smart merchant pattern matching with 30+ pre-configured rules
- 📝 **Transaction Management** - Searchable, filterable transaction list with inline category editing
- 🌳 **Category Hierarchy** - Organize spending with parent/child categories and custom colors/icons
- ✅ **Review Queue** - Quickly categorize uncategorized transactions with bulk operations
- 🔒 **100% Local** - All data stored locally in SQLite, no cloud services required

## Tech Stack

- **Nuxt 4** - Vue.js framework
- **SQLite** via `better-sqlite3` - Local database
- **Drizzle ORM** - Type-safe database queries
- **Nuxt UI** - Beautiful Tailwind-based components
- **Chart.js** - Data visualizations
- **@noble/hashes** - Secure fingerprint generation for deduplication

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

1. Clone the repository (or use this existing directory)

2. Install dependencies:
```bash
npm install
```

3. The database will be automatically created on first run. To manually run migrations:
```bash
npm run db:generate
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Initial Setup

1. **Seed the database** - On first launch, navigate to the Categories page. The database will automatically seed with default categories and merchant rules.

   Alternatively, you can manually seed by making a POST request:
   ```bash
   curl -X POST http://localhost:3000/api/seed
   ```

2. **Import your first CSV** - Navigate to the Import page and drag-and-drop your Apple Card transaction CSV file.

3. **Review uncategorized transactions** - Visit the Review page to quickly categorize any transactions that weren't auto-categorized.

## Using the App

### Importing Transactions

1. Navigate to **Import** page
2. Drag and drop your Apple Card CSV export (or click to browse)
3. The app will:
   - Parse the CSV
   - Generate fingerprints for each transaction
   - Check for duplicates (skip any already imported)
   - Auto-categorize using merchant rules
   - Create/update merchant records
4. Review the import summary and navigate to the Review page for uncategorized items

### Dashboard

- View total spending for selected date range (last 30/60/90/365 days or all time)
- Visualize spending by category (donut chart)
- Track spending over time (bar chart by month)
- See top merchants and spending per person
- Click on any category to filter transactions

### Transactions

- Search by description or notes
- Filter by category, purchaser, or transaction type
- Inline category assignment via dropdown
- Pagination for large datasets

### Categories

- View hierarchical category tree (parent → subcategories)
- Create/edit/delete categories with custom colors and emoji icons
- Manage merchant rules (pattern matching for auto-categorization)
- Higher priority rules are matched first

### Review Queue

- See all uncategorized transactions
- Bulk categorize with checkboxes
- Quick assign from suggested categories
- Skip transactions to review later

## Database Schema

- **categories** - Hierarchical category structure with colors/icons
- **merchants** - Normalized merchant names with raw description mappings
- **merchant_rules** - Pattern-based auto-categorization rules
- **transactions** - All imported transactions with fingerprints for deduplication
- **import_sessions** - Tracks each CSV import run

## Deduplication Logic

The app generates a SHA-256 fingerprint for each transaction:
```
fingerprint = SHA256(transaction_date + "|" + description + "|" + amount + "|" + purchased_by)
```

- **Within a CSV file**: All transactions are imported (real duplicate charges are preserved)
- **Across imports**: Transactions with matching fingerprints are skipped
- This prevents re-importing the same monthly statement multiple times

## Auto-Categorization

Three-tier fallback system:

1. **Merchant Rules** - Pattern matching (e.g., "publix" → Groceries)
2. **Apple Card Category** - Uses the CSV's Category column as a hint
3. **Uncategorized** - Flagged for manual review

User corrections automatically create new merchant rules, so the system learns over time.

## Development

### Database Commands

```bash
# Generate migration from schema changes
npm run db:generate

# View database in Drizzle Studio
npm run db:studio

# Seed database with default data
curl -X POST http://localhost:3000/api/seed
```

### Project Structure

```
app/
  pages/           # Nuxt pages (routes)
  components/      # Vue components
    charts/        # Chart.js visualizations
server/
  api/             # API endpoints
  db/              # Database schema, migrations, seed
  utils/           # Utility functions (fingerprinting, categorization)
  plugins/         # Nitro plugins (auto-run migrations)
data/              # SQLite database file (created on first run)
```

## Future Enhancements

Potential features to add:

- **Tags** - Orthogonal to categories (e.g., "vacation", "business")
- **Recurring detection** - Identify subscriptions and regular payments
- **Multi-source import** - Support Chase, BofA, etc. CSV formats
- **Export reports** - PDF/Excel reports of spending analysis
- **Budget tracking** - Set monthly budgets per category
- **Search improvements** - Full-text search across all fields

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
