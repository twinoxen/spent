import { jwtVerify } from 'jose'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip non-API routes and public auth/oauth endpoints
  if (
    !path.startsWith('/api/') ||
    path.startsWith('/api/auth/') ||
    path.startsWith('/api/oauth/')
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
    const baseUrl = config.public.appUrl || 'https://spent-iota.vercel.app'

    // MCP tokens have an audience claim — verify it
    const verifyOptions = bearerToken
      ? { audience: `${baseUrl}/api/mcp` }
      : undefined

    const { payload } = await jwtVerify(token, secret, verifyOptions)
    event.context.user = { id: payload.userId as number, email: payload.email as string }
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired session' })
  }
})
