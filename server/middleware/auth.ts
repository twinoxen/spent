import { jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { apiTokens } from '../db/schema'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip non-API routes, public auth endpoints (login/register/logout), and OAuth endpoints.
  // Authenticated /api/auth/* endpoints (me, tokens) must NOT be skipped so that
  // event.context.user is populated before their handlers run.
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/logout']
  const isPublicHealthDbGet = path === '/api/health/db' && event.method === 'GET'
  if (
    !path.startsWith('/api/') ||
    publicPaths.some(p => path.startsWith(p)) ||
    path.startsWith('/api/oauth/') ||
    isPublicHealthDbGet
  ) {
    return
  }

  // Accept either the session cookie or an Authorization: Bearer token
  const cookieToken = getCookie(event, 'auth_token')
  const authHeader = getHeader(event, 'authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = cookieToken ?? bearerToken

  if (!token) {
    // MCP endpoint: return 401 with WWW-Authenticate so clients can discover the auth server
    if (path.startsWith('/api/mcp')) {
      const config = useRuntimeConfig()
      const baseUrl = config.public.appUrl || 'https://spent-iota.vercel.app'
      setResponseHeader(
        event,
        'WWW-Authenticate',
        `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
      )
    }
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  try {
    const config = useRuntimeConfig()
    const secret = new TextEncoder().encode(config.jwtSecret)

    // Verify the token without requiring an audience claim.
    // PATs (personal access tokens) carry a jti and have no audience.
    // OAuth-issued tokens carry an audience claim which is simply ignored here —
    // they still authenticate the user for all API routes.
    const { payload } = await jwtVerify(token, secret)

    // PATs carry a jti claim — verify it exists in the apiTokens table (not revoked)
    if (bearerToken && payload.jti) {
      const db = await getDb()
      const [row] = await db
        .select({ id: apiTokens.id })
        .from(apiTokens)
        .where(eq(apiTokens.jti, payload.jti))
      if (!row) {
        throw createError({ statusCode: 401, message: 'Token has been revoked' })
      }
    }

    event.context.user = { id: payload.userId as number, email: payload.email as string }
  } catch (err: unknown) {
    // Re-throw H3 errors (e.g. explicit revocation) as-is
    if (err && typeof err === 'object' && 'statusCode' in err) throw err
    throw createError({ statusCode: 401, message: 'Invalid or expired session' })
  }
})
