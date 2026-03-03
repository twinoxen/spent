export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const config = useRuntimeConfig()
  const baseUrl = config.public.appUrl || 'https://spent-iota.vercel.app'

  if (path === '/.well-known/oauth-protected-resource') {
    setResponseHeader(event, 'Content-Type', 'application/json')
    return {
      resource: `${baseUrl}/api/mcp`,
      authorization_servers: [baseUrl],
    }
  }

  if (path === '/.well-known/oauth-authorization-server') {
    setResponseHeader(event, 'Content-Type', 'application/json')
    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/api/oauth/token`,
      registration_endpoint: `${baseUrl}/api/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
    }
  }
})
