// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  },
  nitro: {
    hooks: {
      'dev:reload': () => {
        import('./server/db/migrate').then(({ runMigrations }) => {
          runMigrations()
        })
      }
    }
  }
})
