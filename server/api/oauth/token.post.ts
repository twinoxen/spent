import { eq, and } from 'drizzle-orm'
import { SignJWT } from 'jose'
import { sha256 } from '@noble/hashes/sha256'
import { getDb } from '../../db'
import { oauthCodes, users } from '../../db/schema'

function base64urlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export default defineEventHandler(async (event) => {
  // OAuth token endpoint accepts application/x-www-form-urlencoded
  const contentType = getHeader(event, 'content-type') ?? ''
  let body: Record<string, string>

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await readRawBody(event) ?? ''
    body = Object.fromEntries(new URLSearchParams(text))
  } else {
    body = await readBody(event)
  }

  const { grant_type, code, redirect_uri, client_id, code_verifier } = body

  // Cursor has a known bug: it sends Basic auth headers despite being a public client
  // We parse the Authorization header but don't require it for public clients
  let effectiveClientId = client_id
  const authHeader = getHeader(event, 'authorization')
  if (!effectiveClientId && authHeader?.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6))
    effectiveClientId = decoded.split(':')[0]
  }

  if (grant_type !== 'authorization_code') {
    throw createError({ statusCode: 400, message: 'Unsupported grant_type' })
  }
  if (!code || !redirect_uri || !effectiveClientId || !code_verifier) {
    throw createError({ statusCode: 400, message: 'Missing required parameters' })
  }

  const db = await getDb()

  const [oauthCode] = await db.select().from(oauthCodes).where(eq(oauthCodes.code, code))

  if (!oauthCode) {
    throw createError({ statusCode: 400, message: 'Invalid authorization code' })
  }
  if (oauthCode.used) {
    throw createError({ statusCode: 400, message: 'Authorization code already used' })
  }
  if (oauthCode.expiresAt < new Date()) {
    throw createError({ statusCode: 400, message: 'Authorization code expired' })
  }
  if (oauthCode.clientId !== effectiveClientId) {
    throw createError({ statusCode: 400, message: 'client_id mismatch' })
  }
  if (oauthCode.redirectUri !== redirect_uri) {
    throw createError({ statusCode: 400, message: 'redirect_uri mismatch' })
  }

  // Verify PKCE: BASE64URL(SHA256(code_verifier)) must equal stored code_challenge
  const verifierBytes = new TextEncoder().encode(code_verifier)
  const challengeBytes = sha256(verifierBytes)
  const computedChallenge = base64urlEncode(challengeBytes)

  if (computedChallenge !== oauthCode.codeChallenge) {
    throw createError({ statusCode: 400, message: 'code_verifier does not match code_challenge' })
  }

  // Mark code as used
  await db.update(oauthCodes).set({ used: true }).where(eq(oauthCodes.id, oauthCode.id))

  // Fetch user
  const [user] = await db.select().from(users).where(eq(users.id, oauthCode.userId))
  if (!user) {
    throw createError({ statusCode: 500, message: 'User not found' })
  }

  const config = useRuntimeConfig()
  const secret = new TextEncoder().encode(config.jwtSecret)
  const baseUrl = config.public.appUrl || 'https://spent-iota.vercel.app'
  const expiresInSeconds = 60 * 60 * 24 * 7 // 7 days

  const accessToken = await new SignJWT({
    userId: user.id,
    email: user.email,
    mcp: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .setAudience(`${baseUrl}/api/mcp`)
    .sign(secret)

  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, 'Cache-Control', 'no-store')

  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresInSeconds,
  }
})
