import type { Config } from 'drizzle-kit'

const databaseUrl = process.env.STORAGE_DATABASE_URL ?? process.env.DATABASE_URL ?? ''

const parsedUrl = (() => {
  try {
    return databaseUrl ? new URL(databaseUrl) : null
  } catch {
    return null
  }
})()

const hostname = parsedUrl?.hostname?.toLowerCase() ?? ''
const protocol = parsedUrl?.protocol ?? ''
const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
const isNeonHost = hostname.includes('neon')
const isPostgresUrl = protocol === 'postgres:' || protocol === 'postgresql:'
const shouldUseNodePostgres = isLocalHost || (isPostgresUrl && !isNeonHost)

const rawSslMode = parsedUrl?.searchParams.get('sslmode')
const sslMode = rawSslMode === 'require' || rawSslMode === 'allow' || rawSslMode === 'prefer' || rawSslMode === 'verify-full'
  ? rawSslMode
  : undefined

const dbCredentials: Config['dbCredentials'] = shouldUseNodePostgres && parsedUrl
  ? {
      host: parsedUrl.hostname,
      port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
      database: decodeURIComponent(parsedUrl.pathname.replace(/^\//, '')),
      ssl: isLocalHost ? false : sslMode,
    }
  : {
      url: databaseUrl,
    }

export default {
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials,
} satisfies Config
