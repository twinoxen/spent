# Quick Start Guide

## 🎉 Your Finance Visualizer is Ready!

The app has been successfully built and is currently running at **http://localhost:3000**

### ✅ What's Already Done

1. **Database**: SQLite database created with migrations applied
2. **Seed Data**: 21 categories and 39 merchant rules pre-configured
3. **Sample Import**: Your January 2026 Apple Card transactions have been imported
   - 125 transactions imported
   - 1 skipped (duplicate)
   - Total spending tracked: **$5,969.90**

### 🚀 Next Steps

1. **Open the app**: Visit [http://localhost:3000](http://localhost:3000)

2. **Explore the Dashboard**
   - See your spending by category
   - View spending trends over time
   - Check top merchants and per-person breakdowns

3. **Review Uncategorized Transactions**
   - Navigate to the "Review" page
   - Quickly assign categories to any uncategorized transactions
   - The system learns from your corrections

4. **Manage Categories**
   - Visit the "Categories" page
   - Create new categories or subcategories
   - Add merchant rules for auto-categorization

5. **Import More Data**
   - Go to the "Import" page
   - Drag and drop more Apple Card CSV files
   - Duplicates are automatically detected

### 📊 Current Stats

- **Total Transactions**: 125
- **Total Spending**: $5,969.90
- **Categories Used**: 15
- **Top Merchant**: Py *sodo Kava Llc

### 🔧 Development

The development server is running. Any changes you make to the code will automatically reload.

**Stop the server**: Press `Ctrl+C` in the terminal

**Restart the server**:
```bash
npm run dev
```

**View database in Drizzle Studio**:
```bash
npm run db:studio
```

### 📁 Key Files

- **Database**: `data/finance.db`
- **Import folder**: `import/` (place your CSV files here)
- **Migrations**: `server/db/migrations/`

### 💡 Tips

1. **Auto-Categorization**: The app learns from your corrections. When you manually assign a category to a transaction, consider adding a merchant rule in the Categories page so future transactions from that merchant are automatically categorized.

2. **Deduplication**: You can safely re-import the same CSV file. The app uses transaction fingerprints to prevent duplicates.

3. **Date Ranges**: Use the date range selector on the Dashboard to view spending for different time periods.

4. **Bulk Operations**: On the Review page, use checkboxes to categorize multiple transactions at once.

### 🎨 Customization

- **Categories**: All categories are fully customizable - change names, colors, icons
- **Merchant Rules**: Add regex patterns for complex matching (e.g., `tst\\*` matches all restaurants with TST prefix)
- **Subcategories**: Create hierarchical categories (e.g., "Food & Dining" → "Restaurants", "Coffee & Drinks")

### 🐛 Troubleshooting

If you see warnings about `@noble/hashes` during startup, they can be safely ignored. These are Vite bundling warnings, but the imports work correctly at runtime.

### 📖 Full Documentation

See [README.md](README.md) for complete documentation, including:
- Detailed feature descriptions
- Database schema
- API endpoints
- Development guide

---

**Enjoy visualizing your spending! 💰📊**
