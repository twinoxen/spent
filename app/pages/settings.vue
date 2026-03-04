<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account and API access.</p>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-key" class="w-5 h-5 text-primary-500" />
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">API Tokens</h2>
        </div>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Personal access tokens grant full API access to your account. Use them with any HTTP client
          via an <code class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code> header,
          including AI agents via MCP.
        </p>
      </template>

      <div class="space-y-4">
        <!-- Existing tokens list -->
        <template v-if="tokens && tokens.length > 0">
          <ul class="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <li
              v-for="t in tokens"
              :key="t.id"
              class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ t.name }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Created {{ formatDate(t.createdAt!) }}</p>
              </div>
              <UButton
                icon="i-heroicons-trash"
                size="xs"
                color="error"
                variant="ghost"
                :loading="revoking === t.id"
                title="Revoke token"
                @click="revokeToken(t.id)"
              />
            </li>
          </ul>
        </template>
        <template v-else-if="tokens">
          <p class="text-sm text-gray-500 dark:text-gray-400">No active tokens. Create one below to enable API access.</p>
        </template>

        <!-- Newly created token — shown once -->
        <template v-if="newToken">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-heroicons-eye-slash"
            title="Copy your token now"
            description="This token will not be shown again. Store it somewhere safe."
          />
          <div class="relative">
            <pre class="text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-gray-800 dark:text-gray-200 pr-10">{{ newToken }}</pre>
            <UButton
              icon="i-heroicons-clipboard-document"
              size="xs"
              color="neutral"
              variant="ghost"
              class="absolute top-2 right-2"
              :title="copied ? 'Copied!' : 'Copy to clipboard'"
              @click="copyToken"
            />
          </div>
          <p v-if="copied" class="text-xs text-green-600 dark:text-green-400">Copied to clipboard!</p>
        </template>

        <!-- Create new token form -->
        <div class="flex items-center gap-2 pt-1">
          <UInput
            v-model="newTokenName"
            placeholder="Token name (e.g. Cursor, Claude Desktop)"
            class="flex-1"
            :disabled="creating"
            @keydown.enter="createToken"
          />
          <UButton
            label="Create Token"
            icon="i-heroicons-plus"
            :loading="creating"
            :disabled="!newTokenName.trim()"
            color="primary"
            variant="soft"
            @click="createToken"
          />
        </div>
      </div>
    </UCard>

    <UCard class="border border-red-200 dark:border-red-900">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
          <h2 class="text-base font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
        </div>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Permanently delete your account and all associated data.
        </p>
      </template>

      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">Delete Account</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Remove your account, transactions, merchants, categories, and all other data. This cannot be undone.
          </p>
        </div>
        <UButton
          label="Delete Account"
          icon="i-heroicons-trash"
          color="error"
          variant="soft"
          class="ml-6 shrink-0"
          @click="showDeleteModal = true"
        />
      </div>
    </UCard>

    <UModal v-model:open="showDeleteModal" :dismissible="!deleting">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-start gap-4">
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-gray-900 dark:text-white">Delete your account?</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This will permanently delete your account and all associated data — transactions, accounts, merchants,
                categories, and import history. <strong class="text-gray-700 dark:text-gray-300">This cannot be undone.</strong>
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              :disabled="deleting"
              @click="showDeleteModal = false"
            />
            <UButton
              label="Delete Account"
              icon="i-heroicons-trash"
              color="error"
              :loading="deleting"
              @click="deleteAccount"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
interface ApiToken {
  id: number
  name: string
  createdAt: string | null
}

const newTokenName = ref('')
const newToken = ref<string | null>(null)
const copied = ref(false)
const creating = ref(false)
const revoking = ref<number | null>(null)
const showDeleteModal = ref(false)
const deleting = ref(false)

const { logout } = useAuth()

const { data: tokens, refresh: refreshTokens } = await useFetch<ApiToken[]>('/api/auth/tokens')

async function createToken() {
  const name = newTokenName.value.trim()
  if (!name) return
  creating.value = true
  newToken.value = null
  try {
    const res = await $fetch<{ id: number; name: string; createdAt: string; token: string }>('/api/auth/tokens', {
      method: 'POST',
      body: { name },
    })
    newToken.value = res.token
    newTokenName.value = ''
    await refreshTokens()
  } finally {
    creating.value = false
  }
}

async function revokeToken(id: number) {
  revoking.value = id
  newToken.value = null
  try {
    await $fetch(`/api/auth/tokens/${id}`, { method: 'DELETE' })
    await refreshTokens()
  } finally {
    revoking.value = null
  }
}

async function deleteAccount() {
  deleting.value = true
  try {
    await $fetch('/api/auth/me', { method: 'DELETE' })
    await logout()
  } finally {
    deleting.value = false
    showDeleteModal.value = false
  }
}

async function copyToken() {
  if (!newToken.value) return
  await navigator.clipboard.writeText(newToken.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2500)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}
</script>
