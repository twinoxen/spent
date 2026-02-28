<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primary-600 dark:text-primary-400">Spent</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">See where your money is going</p>
      </div>

      <UCard>
        <div class="space-y-5">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ mode === 'login' ? 'Sign in' : 'Create account' }}
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {{ mode === 'login' ? 'Welcome back' : 'Get started with Spent' }}
            </p>
          </div>

          <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" icon="i-heroicons-exclamation-circle" />

          <UForm :state="form" @submit="handleSubmit" class="space-y-4">
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
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                class="w-full"
                :disabled="loading"
              />
            </UFormField>

            <UButton
              type="submit"
              class="w-full justify-center"
              :loading="loading"
            >
              {{ mode === 'login' ? 'Sign in' : 'Create account' }}
            </UButton>
          </UForm>

          <div class="text-center text-sm text-gray-500 dark:text-gray-400">
            {{ mode === 'login' ? "Don't have an account?" : 'Already have an account?' }}
            <button
              type="button"
              class="ml-1 text-primary-600 dark:text-primary-400 hover:underline font-medium"
              @click="toggleMode"
            >
              {{ mode === 'login' ? 'Sign up' : 'Sign in' }}
            </button>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { user, setUser } = useAuth()

const mode = ref<'login' | 'register'>('login')
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({ email: '', password: '' })

if (user.value) {
  await navigateTo('/', { replace: true })
}

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMessage.value = ''
}

async function handleSubmit() {
  errorMessage.value = ''
  loading.value = true

  try {
    const endpoint = mode.value === 'login' ? '/api/auth/login' : '/api/auth/register'
    const data = await $fetch<{ id: number; email: string }>(endpoint, {
      method: 'POST',
      body: { email: form.email, password: form.password },
    })
    setUser(data)
    await navigateTo('/')
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    errorMessage.value = error?.data?.message ?? 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
