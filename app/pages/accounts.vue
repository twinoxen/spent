<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Accounts</h1>
      <UButton label="Add Account" color="primary" icon="i-heroicons-plus" @click="openCreate" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-24">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>

    <!-- Empty State -->
    <div v-else-if="accounts.length === 0" class="text-center py-24">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">No accounts yet</h3>
      <p class="text-sm text-gray-400 dark:text-gray-500 mb-6">Add your credit cards and bank accounts to get started.</p>
      <UButton label="Add Account" color="primary" @click="openCreate" />
    </div>

    <!-- Account Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="account in accounts"
        :key="account.id"
        class="relative rounded-2xl p-5 text-white shadow-md overflow-hidden"
        :style="{ background: `linear-gradient(135deg, ${account.color}, ${account.color}cc)` }"
      >
        <!-- Background pattern -->
        <div class="absolute inset-0 opacity-10">
          <div class="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white" />
          <div class="absolute -right-4 -bottom-12 w-56 h-56 rounded-full bg-white" />
        </div>

        <div class="relative">
          <!-- Header -->
          <div class="flex items-start justify-between mb-8">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider opacity-75">{{ ACCOUNT_TYPE_LABELS[account.type] ?? account.type }}</p>
              <h3 class="text-xl font-bold mt-0.5">{{ account.name }}</h3>
              <p v-if="account.institution" class="text-sm opacity-80 mt-0.5">{{ account.institution }}</p>
            </div>
            <div class="flex gap-1.5">
              <button
                class="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="Edit account"
                @click="openEdit(account)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                class="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="Delete account"
                @click="confirmDelete(account)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-end justify-between">
            <div v-if="account.lastFour" class="font-mono text-base tracking-widest opacity-90">
              •••• {{ account.lastFour }}
            </div>
            <div v-else class="text-sm opacity-70">No card number</div>
            <div class="text-right">
              <p class="text-2xl font-bold tabular-nums">{{ account.transactionCount }}</p>
              <p class="text-xs opacity-75">transaction{{ account.transactionCount !== 1 ? 's' : '' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="modalOpen" :title="editingAccount ? 'Edit Account' : 'Add Account'">
      <template #body>
        <form class="space-y-4" @submit.prevent="saveAccount">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Account Name *</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="e.g. Apple Card, Chase Checking"
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Account Type</label>
            <select
              v-model="form.type"
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option v-for="(label, value) in ACCOUNT_TYPE_LABELS" :key="value" :value="value">{{ label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Institution</label>
            <input
              v-model="form.institution"
              type="text"
              placeholder="e.g. Apple, Chase, Wells Fargo"
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Last 4 Digits</label>
            <input
              v-model="form.lastFour"
              type="text"
              placeholder="1234"
              maxlength="4"
              class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Color</label>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="color in PRESET_COLORS"
                :key="color"
                type="button"
                class="w-8 h-8 rounded-full transition-all border-2"
                :class="form.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                :style="{ backgroundColor: color }"
                @click="form.color = color"
              />
            </div>
          </div>

          <!-- Preview -->
          <div
            class="rounded-xl p-4 text-white text-sm font-medium transition-all"
            :style="{ background: `linear-gradient(135deg, ${form.color}, ${form.color}cc)` }"
          >
            <p class="opacity-75 text-xs">{{ ACCOUNT_TYPE_LABELS[form.type] }}</p>
            <p class="font-bold text-base mt-0.5">{{ form.name || 'Account Name' }}</p>
            <p v-if="form.institution" class="opacity-80 text-xs mt-0.5">{{ form.institution }}</p>
            <div v-if="form.lastFour" class="font-mono mt-3 tracking-widest">•••• {{ form.lastFour }}</div>
          </div>

          <div class="flex justify-end gap-3 pt-1">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="modalOpen = false" />
            <UButton :label="editingAccount ? 'Save Changes' : 'Add Account'" color="primary" type="submit" :loading="saving" />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="deleteModalOpen" title="Delete Account">
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Are you sure you want to delete <span class="font-semibold">{{ deletingAccount?.name }}</span>?
        </p>
        <p class="text-sm text-red-500 dark:text-red-400">
          This cannot be undone. Accounts with transactions cannot be deleted.
        </p>
        <div class="flex justify-end gap-3 mt-6">
          <UButton label="Cancel" color="neutral" variant="ghost" @click="deleteModalOpen = false" />
          <UButton label="Delete" color="error" :loading="deleting" @click="deleteAccount" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  debit: 'Debit Card',
  checking: 'Checking Account',
  savings: 'Savings Account',
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#64748b', // slate
  '#1e293b', // dark slate
]

const loading = ref(true)
const accounts = ref<any[]>([])

const modalOpen = ref(false)
const editingAccount = ref<any>(null)
const saving = ref(false)

const deleteModalOpen = ref(false)
const deletingAccount = ref<any>(null)
const deleting = ref(false)

const form = ref({
  name: '',
  type: 'credit_card',
  institution: '',
  lastFour: '',
  color: PRESET_COLORS[0],
})

async function loadAccounts() {
  loading.value = true
  try {
    accounts.value = await $fetch('/api/accounts')
  } catch (error) {
    console.error('Failed to load accounts:', error)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingAccount.value = null
  form.value = { name: '', type: 'credit_card', institution: '', lastFour: '', color: PRESET_COLORS[0] }
  modalOpen.value = true
}

function openEdit(account: any) {
  editingAccount.value = account
  form.value = {
    name: account.name,
    type: account.type,
    institution: account.institution ?? '',
    lastFour: account.lastFour ?? '',
    color: account.color ?? PRESET_COLORS[0],
  }
  modalOpen.value = true
}

async function saveAccount() {
  saving.value = true
  try {
    const payload = {
      name: form.value.name,
      type: form.value.type,
      institution: form.value.institution || null,
      lastFour: form.value.lastFour || null,
      color: form.value.color,
    }

    if (editingAccount.value) {
      await $fetch(`/api/accounts/${editingAccount.value.id}`, { method: 'PATCH', body: payload })
    } else {
      await $fetch('/api/accounts', { method: 'POST', body: payload })
    }

    modalOpen.value = false
    await loadAccounts()
  } catch (error) {
    console.error('Failed to save account:', error)
  } finally {
    saving.value = false
  }
}

function confirmDelete(account: any) {
  deletingAccount.value = account
  deleteModalOpen.value = true
}

async function deleteAccount() {
  if (!deletingAccount.value) return
  deleting.value = true
  try {
    await $fetch(`/api/accounts/${deletingAccount.value.id}`, { method: 'DELETE' })
    deleteModalOpen.value = false
    await loadAccounts()
  } catch (error: any) {
    const msg = error?.data?.message ?? 'Failed to delete account'
    alert(msg)
  } finally {
    deleting.value = false
  }
}

onMounted(loadAccounts)
</script>
