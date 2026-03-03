<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600 dark:text-primary-400">Spent</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">See where your money is going</p>
      </div>

      <UCard>
        <div class="space-y-5">
          <!-- Error state: missing or invalid params -->
          <div v-if="paramError">
            <UAlert color="error" variant="soft" :description="paramError" icon="i-heroicons-exclamation-circle" />
          </div>

          <!-- Step 1: Login -->
          <template v-else-if="step === 'login'">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Sign in to authorize</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ clientName }}</span> is requesting access to your Spent account.
              </p>
            </div>

            <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" icon="i-heroicons-exclamation-circle" />

            <UForm :state="form" @submit="handleLogin" class="space-y-4">
              <UFormField label="Email" name="email">
                <UInput
                  v-model="form.email"
                  type="email"
                  placeholder="you@example.com"
                  autocomplete="email"
                  class="w-full"
                  :disabled="loading"
                />
              </UFormField>

              <UFormField label="Password" name="password">
                <UInput
                  v-model="form.password"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  class="w-full"
                  :disabled="loading"
                />
              </UFormField>

              <UButton type="submit" class="w-full justify-center" :loading="loading">
                Sign in &amp; Continue
              </UButton>
            </UForm>
          </template>

          <!-- Step 2: Consent -->
          <template v-else-if="step === 'consent'">
            <div class="text-center space-y-3">
              <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center mx-auto">
                <UIcon name="i-heroicons-key" class="text-primary-600 dark:text-primary-400 text-xl" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Authorize access</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Allow <span class="font-medium text-gray-700 dark:text-gray-300">{{ clientName }}</span> to access your Spent account?
                </p>
              </div>
            </div>

            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">This will allow:</p>
              <ul class="space-y-1.5">
                <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <UIcon name="i-heroicons-check-circle" class="text-green-500 shrink-0" />
                  Read your accounts and transactions
                </li>
                <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <UIcon name="i-heroicons-check-circle" class="text-green-500 shrink-0" />
                  View spending stats and categories
                </li>
                <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <UIcon name="i-heroicons-check-circle" class="text-green-500 shrink-0" />
                  Create and update transactions
                </li>
              </ul>
            </div>

            <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" icon="i-heroicons-exclamation-circle" />

            <div class="flex gap-3">
              <UButton variant="outline" class="flex-1 justify-center" :disabled="loading" @click="handleDeny">
                Deny
              </UButton>
              <UButton class="flex-1 justify-center" :loading="loading" @click="handleAuthorize">
                Authorize
              </UButton>
            </div>

            <p class="text-xs text-center text-gray-400 dark:text-gray-500">
              Signed in as {{ form.email }}
            </p>
          </template>

          <!-- Step 3: Done (redirect in progress) -->
          <template v-else-if="step === 'done'">
            <div class="text-center space-y-3 py-2">
              <UIcon name="i-heroicons-check-circle" class="text-green-500 text-4xl mx-auto" />
              <p class="text-sm text-gray-600 dark:text-gray-400">Authorization complete. You can close this window.</p>
            </div>
          </template>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()

// OAuth params from query string
const clientId = route.query.client_id as string
const redirectUri = route.query.redirect_uri as string
const codeChallenge = route.query.code_challenge as string
const state = route.query.state as string

// Validate required params
const paramError = computed(() => {
  if (!clientId) return 'Missing client_id parameter.'
  if (!redirectUri) return 'Missing redirect_uri parameter.'
  if (!codeChallenge) return 'Missing code_challenge parameter.'
  return null
})

const clientName = ref('MCP Client')

// Fetch client name on mount
onMounted(async () => {
  if (paramError.value) return
  try {
    // We don't have a /api/oauth/clients/:id endpoint, but we stored the name at registration.
    // For now, display a generic name — the registration response is only available to the client.
    clientName.value = 'MCP Client'
  } catch {
    // ignore
  }
})

const step = ref<'login' | 'consent' | 'done'>('login')
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({ email: '', password: '' })

function buildRedirectUrl(params: Record<string, string>): string {
  const url = new URL(redirectUri)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

async function handleLogin() {
  errorMessage.value = ''
  loading.value = true
  try {
    // Just validate credentials — we'll use them again in handleAuthorize
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: form.email, password: form.password },
    })
    step.value = 'consent'
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    errorMessage.value = error?.data?.message ?? 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}

async function handleAuthorize() {
  errorMessage.value = ''
  loading.value = true
  try {
    const { code, state: returnedState } = await $fetch<{ code: string; state: string | null }>('/api/oauth/authorize', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_challenge: codeChallenge,
        state,
      },
    })

    step.value = 'done'

    const redirectParams: Record<string, string> = { code }
    if (returnedState) redirectParams.state = returnedState

    // Small delay so the user sees the "done" state
    await new Promise(resolve => setTimeout(resolve, 300))
    window.location.href = buildRedirectUrl(redirectParams)
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    errorMessage.value = error?.data?.message ?? 'Authorization failed. Please try again.'
    step.value = 'login'
  } finally {
    loading.value = false
  }
}

function handleDeny() {
  window.location.href = buildRedirectUrl({ error: 'access_denied', ...(state ? { state } : {}) })
}
</script>
