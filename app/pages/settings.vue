<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account and API access.</p>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-primary-500" />
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">MCP Access Token</h2>
        </div>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Use this token to give an AI agent (e.g. OpenClaw) direct access to your Spent data via MCP.
          Configure it as a static <code class="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">Authorization: Bearer &lt;token&gt;</code> header.
        </p>
      </template>

      <div class="space-y-4">
        <!-- Token just generated — show it once -->
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

        <!-- Status when token exists (and we haven't just generated one) -->
        <template v-else-if="status?.active">
          <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-500 shrink-0" />
            <span>
              Active token issued
              <time :datetime="status.issuedAt!" class="font-medium text-gray-800 dark:text-gray-200">
                {{ formatDate(status.issuedAt!) }}
              </time>
            </span>
          </div>
        </template>

        <!-- No token yet -->
        <template v-else-if="status && !status.active">
          <p class="text-sm text-gray-500 dark:text-gray-400">No active token. Generate one to enable agent access.</p>
        </template>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-1">
          <UButton
            :label="status?.active ? 'Regenerate Token' : 'Generate Token'"
            :icon="status?.active ? 'i-heroicons-arrow-path' : 'i-heroicons-plus'"
            :loading="generating"
            color="primary"
            variant="soft"
            @click="generateToken"
          />
          <UButton
            v-if="status?.active"
            label="Revoke"
            icon="i-heroicons-trash"
            :loading="revoking"
            color="error"
            variant="ghost"
            @click="revokeToken"
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
const newToken = ref<string | null>(null)
const copied = ref(false)
const generating = ref(false)
const revoking = ref(false)
const showDeleteModal = ref(false)
const deleting = ref(false)

const { logout } = useAuth()

const { data: status, refresh: refreshStatus } = await useFetch<{
  active: boolean
  issuedAt: string | null
}>('/api/auth/mcp-token')

async function generateToken() {
  generating.value = true
  newToken.value = null
  try {
    const res = await $fetch<{ token: string; issuedAt: string }>('/api/auth/mcp-token', {
      method: 'POST',
    })
    newToken.value = res.token
    await refreshStatus()
  } finally {
    generating.value = false
  }
}

async function revokeToken() {
  revoking.value = true
  newToken.value = null
  try {
    await $fetch('/api/auth/mcp-token', { method: 'DELETE' })
    await refreshStatus()
  } finally {
    revoking.value = false
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
