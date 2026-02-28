import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { getDb } from '../../db'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password } = body

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email and password are required' })
  }

  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()))

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' })
  }

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
