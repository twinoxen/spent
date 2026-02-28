import { runMigrations } from '../db/migrate'
import { seedDatabase } from '../db/seed'

export default defineNitroPlugin(async () => {
  runMigrations()
  await seedDatabase()
})
