import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getDb } from '../../db'
import { users, oauthClients, oauthCodes } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, client_id, redirect_uri, code_challenge, state } = body

  if (!email || !password || !client_id || !redirect_uri || !code_challenge) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  const db = await getDb()

  // Validate credentials
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()))
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw createError({ statusCode: 401, message: 'Invalid email or password' })
  }

  // Validate client and redirect_uri
  const [client] = await db.select().from(oauthClients).where(eq(oauthClients.clientId, client_id))
  if (!client) {
    throw createError({ statusCode: 400, message: 'Unknown client_id' })
  }
  if (!client.redirectUris.includes(redirect_uri)) {
    throw createError({ statusCode: 400, message: 'redirect_uri does not match registered URIs' })
  }

  // Generate auth code
  const codeBytes = new Uint8Array(32)
  crypto.getRandomValues(codeBytes)
  const code = Array.from(codeBytes).map(b => b.toString(16).padStart(2, '0')).join('')

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  await db.insert(oauthCodes).values({
    code,
    userId: user.id,
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    expiresAt,
  })

  return { code, state: state ?? null }
})
