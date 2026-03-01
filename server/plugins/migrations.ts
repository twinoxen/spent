import { runMigrations } from '../db/migrate'

export default defineNitroPlugin(async () => {
  // On Vercel, migrations are run during the build step via vercel.json's buildCommand.
  // The migration SQL files are not available in the serverless function's runtime filesystem.
  if (process.env.VERCEL) return

  await runMigrations()
})
