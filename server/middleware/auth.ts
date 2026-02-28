import { jwtVerify } from 'jose'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only protect /api/* routes, and skip /api/auth/* entirely
  if (!path.startsWith('/api/') || path.startsWith('/api/auth/')) {
    return
  }

  const token = getCookie(event, 'auth_token')
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  try {
    const config = useRuntimeConfig()
    const secret = new TextEncoder().encode(config.jwtSecret)
    const { payload } = await jwtVerify(token, secret)
    event.context.user = { id: payload.userId as number, email: payload.email as string }
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired session' })
  }
})
