import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { getDb } from '../../db'
import { users } from '../../db/schema'
import { seedDatabase } from '../../db/seed'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email and password are required' })
  }

  if (password.length < 8) {
    throw createError({ statusCode: 400, message: 'Password must be at least 8 characters' })
  }

  const normalizedEmail = email.toLowerCase().trim()

  const db = getDb()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail))
  if (existing) {
    throw createError({ statusCode: 409, message: 'An account with this email already exists' })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const insertedUsers = await db.insert(users).values({ email: normalizedEmail, passwordHash }).returning({
    id: users.id,
    email: users.email,
  })
  const user = insertedUsers[0]
  if (!user) {
    throw createError({ statusCode: 500, message: 'Failed to create account' })
  }

  // Seed default categories and merchant rules for the new user
  await seedDatabase(user.id)

  const config = useRuntimeConfig()
  const secret = new TextEncoder().encode(config.jwtSecret)

  const token = await new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)

  setCookie(event, 'auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return { id: user.id, email: user.email }
})
