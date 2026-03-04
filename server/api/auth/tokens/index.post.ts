import { SignJWT } from 'jose'
import { randomUUID } from 'crypto'
import { getDb } from '../../../db'
import { apiTokens } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const name = body?.name?.trim()
  if (!name) {
    throw createError({ statusCode: 400, message: 'Token name is required' })
  }
  if (name.length > 100) {
    throw createError({ statusCode: 400, message: 'Token name must be 100 characters or fewer' })
  }

  const config = useRuntimeConfig()
  const secret = new TextEncoder().encode(config.jwtSecret)

  const jti = randomUUID()
  const createdAt = new Date()

  const token = await new SignJWT({ userId: user.id, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt(createdAt)
    .sign(secret)

  const db = await getDb()
  const [row] = await db
    .insert(apiTokens)
    .values({ userId: user.id, name, jti, createdAt })
    .returning({ id: apiTokens.id, name: apiTokens.name, createdAt: apiTokens.createdAt })

  return { id: row.id, name: row.name, createdAt: row.createdAt, token }
})
