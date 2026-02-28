<template>
  <div>
    <h1 class="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Import Transactions</h1>

    <UCard>
      <template #header>
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Upload Statement File</p>
      </template>

      <!-- Importing State -->
      <div v-if="importing" class="text-center py-16">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
        <p class="text-base font-medium text-gray-800 dark:text-gray-100">Importing transactions…</p>
        <p v-if="importingPdf" class="text-sm text-gray-400 dark:text-gray-500 mt-1">Extracting text and parsing with AI — this may take 10–20 seconds</p>
        <p v-else class="text-sm text-gray-400 dark:text-gray-500 mt-1">This may take a moment</p>
      </div>

      <!-- Upload Form -->
      <div v-else class="space-y-6">
        <!-- Step 1: Select Account -->
        <div>
          <div class="flex items-center gap-2 mb-3">
            <span class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Select Account</p>
          </div>

          <div v-if="loadingAccounts" class="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
            Loading accounts…
          </div>

          <div v-else class="space-y-3">
            <!-- Account List -->
            <div v-if="accounts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                v-for="account in accounts"
                :key="account.id"
                type="button"
                class="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all"
                :class="selectedAccountId === account.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                @click="selectedAccountId = account.id"
              >
                <div
                  class="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
                  :style="{ backgroundColor: account.color }"
                >
                  {{ account.name[0] }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ account.name }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    {{ ACCOUNT_TYPE_LABELS[account.type] ?? account.type }}
                    <template v-if="account.lastFour"> · •••• {{ account.lastFour }}</template>
                  </p>
                </div>
                <div v-if="selectedAccountId === account.id" class="ml-auto flex-shrink-0">
                  <svg class="w-5 h-5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
              </button>
            </div>

            <!-- Add New Account Inline -->
            <div>
              <button
                type="button"
                class="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                @click="showNewAccountForm = !showNewAccountForm"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                {{ showNewAccountForm ? 'Cancel' : 'Add new account' }}
              </button>

              <div v-if="showNewAccountForm" class="mt-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Name *</label>
                    <input
                      v-model="newAccount.name"
                      type="text"
                      placeholder="Apple Card"
                      class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Type</label>
                    <select
                      v-model="newAccount.type"
                      class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option v-for="(label, value) in ACCOUNT_TYPE_LABELS" :key="value" :value="value">{{ label }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Institution</label>
                    <input
                      v-model="newAccount.institution"
                      type="text"
                      placeholder="Apple"
                      class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Last 4 Digits</label>
                    <input
                      v-model="newAccount.lastFour"
                      type="text"
                      placeholder="1234"
                      maxlength="4"
                      class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Color</label>
                  <div class="flex gap-2 flex-wrap">
                    <button
                      v-for="color in PRESET_COLORS"
                      :key="color"
                      type="button"
                      class="w-7 h-7 rounded-full transition-all border-2"
                      :class="newAccount.color === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
                      :style="{ backgroundColor: color }"
                      @click="newAccount.color = color"
                    />
                  </div>
                </div>
                <UButton
                  label="Create & Select"
                  color="primary"
                  size="sm"
                  :loading="creatingAccount"
                  :disabled="!newAccount.name.trim()"
                  @click="createAndSelectAccount"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="h-px bg-gray-100 dark:bg-gray-800" />

        <!-- Step 2: Upload File -->
        <div :class="{ 'opacity-40 pointer-events-none': !selectedAccountId }">
          <div class="flex items-center gap-2 mb-3">
            <span class="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0"
              :class="selectedAccountId
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'"
            >2</span>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Upload Statement File</p>
            <span v-if="!selectedAccountId" class="text-xs text-gray-400 dark:text-gray-500">(select an account first)</span>
          </div>

          <!-- Drop Zone -->
          <div
            class="border-2 border-dashed rounded-xl p-10 text-center transition-all"
            :class="dragOver
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/10 dark:border-primary-600'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
            @drop.prevent="handleDrop"
            @dragover.prevent="dragOver = true"
            @dragleave.prevent="dragOver = false"
          >
            <div class="flex flex-col items-center gap-4">
              <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-700 dark:text-gray-200">Drag and drop your statement here</p>
                <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">CSV or PDF · or</p>
              </div>
              <UButton label="Choose File" color="primary" variant="soft" @click="($refs.fileInput as HTMLInputElement).click()" />
              <input ref="fileInput" type="file" accept=".csv,.pdf,application/pdf" class="hidden" @change="handleFileSelect" />
            </div>
          </div>

          <!-- Selected File Preview -->
          <div v-if="selectedFile" class="mt-3 space-y-2">
            <div class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
              <div class="flex items-center gap-3">
                <!-- PDF icon -->
                <div v-if="isPdf" class="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h1.5a1 1 0 010 2H9v-4h1.5a1 1 0 010 2" />
                  </svg>
                </div>
                <!-- CSV icon -->
                <div v-else class="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ selectedFile.name }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
              </div>
              <UButton color="error" variant="ghost" size="sm" icon="i-heroicons-x-mark" @click="clearFile" />
            </div>
            <!-- PDF-specific notice -->
            <div v-if="isPdf" class="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/40">
              <svg class="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-xs text-amber-700 dark:text-amber-400">
                PDF statements are parsed using AI. Text is extracted locally, then sent to OpenAI to identify transactions. This requires an OpenAI API key and may take a few seconds longer than CSV imports.
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <UButton
            label="Import"
            color="primary"
            size="lg"
            :disabled="!selectedFile || !selectedAccountId"
            @click="uploadFile"
          />
        </div>
      </div>
    </UCard>
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
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#10b981', '#3b82f6', '#14b8a6',
  '#64748b', '#1e293b',
]

const loadingAccounts = ref(true)
const accounts = ref<any[]>([])
const selectedAccountId = ref<number | null>(null)

const showNewAccountForm = ref(false)
const creatingAccount = ref(false)
const newAccount = ref({ name: '', type: 'credit_card', institution: '', lastFour: '', color: PRESET_COLORS[0] })

const selectedFile = ref<File | null>(null)
const dragOver = ref(false)
const importing = ref(false)
const importingPdf = ref(false)

const isPdf = computed(() => selectedFile.value?.name.toLowerCase().endsWith('.pdf') ?? false)

async function loadAccounts() {
  loadingAccounts.value = true
  try {
    accounts.value = await $fetch('/api/accounts')
    if (accounts.value.length === 1 && !selectedAccountId.value) {
      selectedAccountId.value = accounts.value[0].id
    }
  } catch (error) {
    console.error('Failed to load accounts:', error)
  } finally {
    loadingAccounts.value = false
  }
}

async function createAndSelectAccount() {
  if (!newAccount.value.name.trim()) return
  creatingAccount.value = true
  try {
    const created = await $fetch('/api/accounts', {
      method: 'POST',
      body: {
        name: newAccount.value.name.trim(),
        type: newAccount.value.type,
        institution: newAccount.value.institution || null,
        lastFour: newAccount.value.lastFour || null,
        color: newAccount.value.color,
      },
    }) as any
    await loadAccounts()
    selectedAccountId.value = created.id
    showNewAccountForm.value = false
    newAccount.value = { name: '', type: 'credit_card', institution: '', lastFour: '', color: PRESET_COLORS[0] }
  } catch (error) {
    console.error('Failed to create account:', error)
  } finally {
    creatingAccount.value = false
  }
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  const files = e.dataTransfer?.files
  if (files?.length) selectedFile.value = files.item(0)
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) selectedFile.value = target.files.item(0)
}

function clearFile() { selectedFile.value = null }

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function uploadFile() {
  if (!selectedFile.value || !selectedAccountId.value) return
  importing.value = true
  importingPdf.value = isPdf.value
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    formData.append('accountId', String(selectedAccountId.value))
    const response = await $fetch('/api/import', { method: 'POST', body: formData }) as { stagingSessionId: number }
    await navigateTo(`/import-review/${response.stagingSessionId}`)
  } catch (error) {
    console.error('Import failed:', error)
    importing.value = false
    importingPdf.value = false
  }
}

onMounted(loadAccounts)
</script>
