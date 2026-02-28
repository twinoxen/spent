// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Spent',
      meta: [{ name: 'description', content: 'See where your money is going' }],
    },
  },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production-use-a-long-random-string',
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
