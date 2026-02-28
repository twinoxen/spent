import { seedDatabase } from '../db/seed'

export default defineEventHandler(async (event) => {
  const userId = event.context.user.id

  try {
    await seedDatabase(userId)
    return { success: true, message: 'Database seeded successfully' }
  } catch (error) {
    console.error('Seed error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to seed database',
    })
  }
})
