import { getDb } from '../../db'
import { oauthClients } from '../../db/schema'

const ALLOWED_REDIRECT_SCHEMES = ['cursor://', 'http://localhost', 'http://127.0.0.1', 'https://']

function isAllowedRedirectUri(uri: string): boolean {
  return ALLOWED_REDIRECT_SCHEMES.some(scheme => uri.startsWith(scheme))
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const clientName = body.client_name || 'MCP Client'
  const redirectUris: string[] = body.redirect_uris ?? []
  const grantTypes: string[] = body.grant_types ?? ['authorization_code']
  const responseTypes: string[] = body.response_types ?? ['code']

  if (!redirectUris.length) {
    throw createError({ statusCode: 400, message: 'redirect_uris is required' })
  }

  for (const uri of redirectUris) {
    if (!isAllowedRedirectUri(uri)) {
      throw createError({
        statusCode: 400,
        message: `redirect_uri not allowed: ${uri}. Must use localhost, cursor://, or HTTPS.`,
      })
    }
  }

  const db = await getDb()
  const clientId = crypto.randomUUID()

  await db.insert(oauthClients).values({
    clientId,
    clientName,
    redirectUris,
  })

  setResponseStatus(event, 201)
  return {
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: grantTypes,
    response_types: responseTypes,
    token_endpoint_auth_method: 'none',
  }
})
