import { runMigrations } from '../db/migrate'

export default defineNitroPlugin(async () => {
  // Only auto-run migrations during local development.
  // - On Vercel, migrations are run during the build step via vercel.json's buildCommand.
  // - In production/preview (e.g. `nuxt preview`), the runtime filesystem/bundle may not
  //   include the migration SQL files, and CI runs migrations explicitly before starting.
  if (process.env.VERCEL) return
  if (process.env.NODE_ENV !== 'development') return

  await runMigrations()
})
