import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import { randomUUID } from 'crypto'
import { getDb } from '../../db'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  const secret = new TextEncoder().encode(config.jwtSecret)
  const baseUrl = config.public.appUrl || 'https://spent-iota.vercel.app'

  const jti = randomUUID()
  const issuedAt = new Date()

  const token = await new SignJWT({ userId: user.id, email: user.email, mcp: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt(issuedAt)
    .setAudience(`${baseUrl}/api/mcp`)
    .setExpirationTime('365d')
    .sign(secret)

  const db = await getDb()
  await db
    .update(users)
    .set({ mcpTokenJti: jti, mcpTokenIssuedAt: issuedAt })
    .where(eq(users.id, user.id))

  return { token, issuedAt: issuedAt.toISOString() }
})
