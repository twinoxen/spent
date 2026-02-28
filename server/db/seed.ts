import { getDb } from './index'
import { categories, merchantRules } from './schema'
import { eq } from 'drizzle-orm'

interface SeedCategory {
  name: string
  color?: string
  icon?: string
  children?: SeedCategory[]
}

const seedCategories: SeedCategory[] = [
  {
    name: 'Food & Dining',
    color: '#f59e0b',
    icon: '🍽️',
    children: [
      { name: 'Restaurants', color: '#f59e0b', icon: '🍽️' },
      { name: 'Coffee & Drinks', color: '#92400e', icon: '☕' },
      { name: 'Fast Food', color: '#dc2626', icon: '🍔' },
    ],
  },
  {
    name: 'Groceries',
    color: '#10b981',
    icon: '🛒',
    children: [
      { name: 'Supermarket', color: '#10b981', icon: '🛒' },
      { name: 'Specialty Foods', color: '#059669', icon: '🥬' },
    ],
  },
  {
    name: 'Transportation',
    color: '#3b82f6',
    icon: '🚗',
    children: [
      { name: 'Gas', color: '#2563eb', icon: '⛽' },
      { name: 'Rideshare', color: '#1d4ed8', icon: '🚕' },
      { name: 'Public Transit', color: '#1e40af', icon: '🚇' },
    ],
  },
  {
    name: 'Shopping',
    color: '#ec4899',
    icon: '🛍️',
    children: [
      { name: 'Clothing', color: '#db2777', icon: '👔' },
      { name: 'General Retail', color: '#be185d', icon: '🏬' },
    ],
  },
  {
    name: 'Entertainment',
    color: '#8b5cf6',
    icon: '🎬',
  },
  {
    name: 'Bills & Utilities',
    color: '#6b7280',
    icon: '💡',
  },
  {
    name: 'Health & Wellness',
    color: '#14b8a6',
    icon: '⚕️',
  },
  {
    name: 'Travel',
    color: '#06b6d4',
    icon: '✈️',
  },
  {
    name: 'Personal Care',
    color: '#a855f7',
    icon: '💇',
  },
  {
    name: 'Other',
    color: '#9ca3af',
    icon: '📦',
  },
  {
    name: 'Uncategorized',
    color: '#d1d5db',
    icon: '❓',
  },
]

interface MerchantRuleData {
  pattern: string
  categoryName: string
  priority: number
}

const merchantRulesData: MerchantRuleData[] = [
  // Groceries
  { pattern: 'publix', categoryName: 'Supermarket', priority: 100 },
  { pattern: 'instacart', categoryName: 'Supermarket', priority: 100 },
  { pattern: 'whole foods', categoryName: 'Supermarket', priority: 100 },
  { pattern: 'trader joe', categoryName: 'Supermarket', priority: 100 },
  { pattern: 'fresh market', categoryName: 'Supermarket', priority: 100 },
  { pattern: 'gilead natural foods', categoryName: 'Specialty Foods', priority: 100 },
  
  // Gas
  { pattern: 'shell oil', categoryName: 'Gas', priority: 100 },
  { pattern: 'exxon', categoryName: 'Gas', priority: 100 },
  { pattern: 'speedway', categoryName: 'Gas', priority: 100 },
  { pattern: 'chevron', categoryName: 'Gas', priority: 100 },
  { pattern: 'bp gas', categoryName: 'Gas', priority: 100 },
  
  // Rideshare
  { pattern: 'uber', categoryName: 'Rideshare', priority: 100 },
  { pattern: 'lyft', categoryName: 'Rideshare', priority: 100 },
  
  // Fast Food
  { pattern: 'taco bell', categoryName: 'Fast Food', priority: 100 },
  { pattern: 'chipotle', categoryName: 'Fast Food', priority: 100 },
  { pattern: 'chick-fil', categoryName: 'Fast Food', priority: 100 },
  { pattern: 'doordash', categoryName: 'Fast Food', priority: 90 },
  { pattern: 'pollo tropical', categoryName: 'Fast Food', priority: 100 },
  
  // Coffee
  { pattern: 'coffee', categoryName: 'Coffee & Drinks', priority: 100 },
  { pattern: 'starbucks', categoryName: 'Coffee & Drinks', priority: 100 },
  { pattern: 'kava', categoryName: 'Coffee & Drinks', priority: 100 },
  
  // Restaurants
  { pattern: 'restaurant', categoryName: 'Restaurants', priority: 80 },
  { pattern: 'tst\\*', categoryName: 'Restaurants', priority: 70 },
  { pattern: 'first watch', categoryName: 'Restaurants', priority: 100 },
  { pattern: "jason's deli", categoryName: 'Restaurants', priority: 100 },
  
  // Shopping
  { pattern: 'burlington', categoryName: 'Clothing', priority: 100 },
  { pattern: 'target', categoryName: 'General Retail', priority: 100 },
  { pattern: 'walmart', categoryName: 'General Retail', priority: 100 },
  { pattern: 'hobby-lobby', categoryName: 'General Retail', priority: 100 },
  
  // Entertainment
  { pattern: 'disney', categoryName: 'Entertainment', priority: 100 },
  { pattern: 'universal studios', categoryName: 'Entertainment', priority: 100 },
  { pattern: 'wdw', categoryName: 'Entertainment', priority: 100 },
  { pattern: 'hemingway', categoryName: 'Entertainment', priority: 100 },
  
  // Travel
  { pattern: 'airport', categoryName: 'Travel', priority: 100 },
  { pattern: 'hotel', categoryName: 'Travel', priority: 100 },
  { pattern: 'brightline', categoryName: 'Public Transit', priority: 100 },
  
  // Personal Care
  { pattern: 'barber', categoryName: 'Personal Care', priority: 100 },
  { pattern: 'salon', categoryName: 'Personal Care', priority: 100 },
  { pattern: 'walgreens', categoryName: 'Personal Care', priority: 90 },
]

export async function seedDatabase() {
  const db = getDb()
  
  console.log('🌱 Starting database seed...')
  
  // Check if already seeded
  const existingCategories = await db.select().from(categories).limit(1)
  if (existingCategories.length > 0) {
    console.log('ℹ️  Database already seeded, skipping...')
    return
  }
  
  // Insert categories with hierarchy
  const categoryMap = new Map<string, number>()
  
  async function insertCategory(cat: SeedCategory, parentId: number | null = null, sortOrder: number = 0): Promise<void> {
    const [inserted] = await db.insert(categories).values({
      name: cat.name,
      parentId,
      color: cat.color,
      icon: cat.icon,
      sortOrder,
    }).returning()
    
    categoryMap.set(cat.name, inserted.id)
    
    if (cat.children) {
      for (let i = 0; i < cat.children.length; i++) {
        await insertCategory(cat.children[i], inserted.id, i)
      }
    }
  }
  
  for (let i = 0; i < seedCategories.length; i++) {
    await insertCategory(seedCategories[i], null, i)
  }
  
  console.log(`✅ Inserted ${categoryMap.size} categories`)
  
  // Insert merchant rules
  for (const rule of merchantRulesData) {
    const categoryId = categoryMap.get(rule.categoryName)
    if (categoryId) {
      await db.insert(merchantRules).values({
        pattern: rule.pattern,
        categoryId,
        priority: rule.priority,
      })
    }
  }
  
  console.log(`✅ Inserted ${merchantRulesData.length} merchant rules`)
  console.log('🌱 Database seed complete!')
}
