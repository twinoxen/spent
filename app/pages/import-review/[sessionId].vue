<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 gap-4">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      <p class="text-sm text-gray-400 dark:text-gray-500">Loading staged transactions…</p>
    </div>

    <!-- Committed Result -->
    <div v-else-if="commitResult" class="space-y-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-check" class="w-5 h-5 text-emerald-500" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Import Complete</h1>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-900/30">
          <p class="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Imported</p>
          <p class="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{{ commitResult.imported }}</p>
        </div>
        <div class="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-900/30">
          <p class="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Skipped</p>
          <p class="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{{ commitResult.skipped }}</p>
          <p class="text-xs text-amber-500/70 dark:text-amber-500/60 mt-0.5">duplicates</p>
        </div>
        <div class="p-4 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/30">
          <p class="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">Errors</p>
          <p class="text-3xl font-bold text-red-600 dark:text-red-400 tabular-nums">{{ commitResult.errors.length }}</p>
        </div>
      </div>

      <UCard v-if="commitResult.errors.length > 0">
        <template #header>
          <p class="text-sm font-semibold text-red-600 dark:text-red-400">Errors</p>
        </template>
        <ul class="space-y-1.5">
          <li v-for="(err, i) in commitResult.errors" :key="i" class="text-sm text-red-600 dark:text-red-400 font-mono">{{ err }}</li>
        </ul>
      </UCard>

      <div class="flex gap-3 pt-2">
        <UButton label="View Transactions" color="primary" @click="$router.push('/transactions')" />
        <UButton label="Import Another" color="neutral" variant="outline" @click="$router.push('/import')" />
      </div>
    </div>

    <!-- Review Screen -->
    <div v-else-if="stagingData">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Review Import</h1>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5 truncate">{{ stagingData.session.filename }}</p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <UButton
            :label="autoCategorizing ? 'Categorizing…' : 'Auto-categorize'"
            :loading="autoCategorizing"
            icon="i-heroicons-sparkles"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="autoCategorizing || committing"
            @click="runAutoCategorize"
          />
          <UButton
            label="Add Category"
            icon="i-heroicons-plus"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="committing"
            @click="openAddCategoryModal"
          />
          <UButton
            :label="commitLabel"
            :loading="committing"
            color="primary"
            :disabled="selectedCount === 0 || committing"
            @click="commitImport"
          />
        </div>
      </div>

      <!-- Selection bar -->
      <UCard class="mb-4">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                :checked="allSelected"
                :indeterminate="someSelected && !allSelected"
                @change="toggleAll"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
                {{ allSelected ? 'Deselect all' : 'Select all' }}
              </span>
            </label>
            <span class="text-sm text-gray-400 dark:text-gray-500">
              {{ selectedCount }} of {{ stagingData.transactions.length }} selected
            </span>
          </div>

          <div class="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500">
            <span v-if="duplicateCount > 0" class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              {{ duplicateCount }} duplicate{{ duplicateCount !== 1 ? 's' : '' }} (deselected)
            </span>
            <span v-if="autoCategorizeResult" class="text-emerald-500 dark:text-emerald-400 font-medium">
              ✓ Categorized {{ autoCategorizeResult.categorized }}/{{ autoCategorizeResult.total }}
            </span>
          </div>
        </div>
      </UCard>

      <!-- Transaction List -->
      <UCard>
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="tx in stagingData.transactions"
            :key="tx.id"
            class="flex items-center gap-3 py-3 px-1 transition-colors"
            :class="tx.isSelected ? '' : 'opacity-50'"
          >
            <!-- Checkbox -->
            <input
              type="checkbox"
              class="w-4 h-4 flex-shrink-0 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
              :checked="tx.isSelected"
              @change="toggleTransaction(tx)"
            />

            <!-- Date -->
            <span class="text-xs text-gray-400 dark:text-gray-500 font-mono w-20 flex-shrink-0 tabular-nums">
              {{ formatDate(tx.transactionDate) }}
            </span>

            <!-- Description + merchant -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {{ tx.merchantName || tx.description }}
              </p>
              <p v-if="tx.merchantName && tx.merchantName !== tx.description" class="text-xs text-gray-400 dark:text-gray-500 truncate">
                {{ tx.description }}
              </p>
            </div>

            <!-- Duplicate badge -->
            <span
              v-if="tx.isDuplicate"
              class="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            >
              duplicate
            </span>

            <!-- Category selector -->
            <div class="w-44 flex-shrink-0">
              <select
                :value="tx.categoryId ?? ''"
                class="w-full px-2.5 py-1.5 text-xs rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                @change="updateCategory(tx, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">— uncategorized —</option>
                <option v-for="cat in stagingData.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <!-- Amount -->
            <span
              class="text-sm font-semibold tabular-nums w-20 text-right flex-shrink-0"
              :class="tx.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'"
            >
              {{ formatAmount(tx.amount) }}
            </span>
          </div>

          <div v-if="stagingData.transactions.length === 0" class="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            No transactions found in this import session.
          </div>
        </div>
      </UCard>
    </div>

    <!-- Add Category Modal -->
    <UModal v-model:open="showCategoryModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Add Category</p>
          </template>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <input
                v-model="categoryForm.name"
                type="text"
                placeholder="e.g., Groceries"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Parent Category (optional)</label>
              <select
                v-model="categoryForm.parentId"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option :value="null">— None (top-level) —</option>
                <option v-for="cat in stagingData?.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <div class="flex gap-4">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Icon (emoji)</label>
                <input
                  v-model="categoryForm.icon"
                  type="text"
                  placeholder="🏷️"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
                <input
                  v-model="categoryForm.color"
                  type="color"
                  class="h-[38px] w-16 px-1 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showCategoryModal = false" />
              <UButton label="Add Category" color="primary" :disabled="!categoryForm.name" @click="saveCategory" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const sessionId = Number(route.params.sessionId)

interface StagingTransaction {
  id: number
  importSessionId: number
  transactionDate: string
  clearingDate: string | null
  description: string
  merchantName: string
  sourceCategory: string | null
  amount: number
  type: string
  purchasedBy: string | null
  fingerprint: string
  categoryId: number | null
  categoryName: string | null
  isDuplicate: boolean
  isSelected: boolean
}

interface StagingData {
  session: {
    id: number
    filename: string
    status: string
    accountId: number
    sourceType: string
  }
  transactions: StagingTransaction[]
  categories: { id: number; name: string }[]
}

interface CommitResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

const loading = ref(true)
const stagingData = ref<StagingData | null>(null)
const committing = ref(false)
const autoCategorizing = ref(false)
const commitResult = ref<CommitResult | null>(null)
const autoCategorizeResult = ref<{ categorized: number; total: number } | null>(null)

const showCategoryModal = ref(false)
const categoryForm = ref({ name: '', parentId: null as number | null, icon: '', color: '#3b82f6' })

async function loadStagingData() {
  loading.value = true
  try {
    stagingData.value = await $fetch(`/api/import/staging/${sessionId}`) as StagingData
  } catch (error) {
    console.error('Failed to load staging data:', error)
  } finally {
    loading.value = false
  }
}

const selectedCount = computed(() =>
  stagingData.value?.transactions.filter(tx => tx.isSelected).length ?? 0
)

const duplicateCount = computed(() =>
  stagingData.value?.transactions.filter(tx => tx.isDuplicate).length ?? 0
)

const allSelected = computed(() =>
  stagingData.value?.transactions.length > 0 &&
  stagingData.value.transactions.every(tx => tx.isSelected)
)

const someSelected = computed(() =>
  stagingData.value?.transactions.some(tx => tx.isSelected) ?? false
)

const commitLabel = computed(() => {
  const count = selectedCount.value
  return count === 0 ? 'Nothing selected' : `Commit ${count} transaction${count !== 1 ? 's' : ''}`
})

function toggleAll() {
  if (!stagingData.value) return
  const newValue = !allSelected.value
  stagingData.value.transactions.forEach(tx => { tx.isSelected = newValue })
  // Persist all in a single batch via individual PATCHes (fire & forget, optimistic)
  stagingData.value.transactions.forEach(tx => {
    $fetch(`/api/import/staging/${sessionId}/transactions/${tx.id}`, {
      method: 'PATCH',
      body: { isSelected: newValue },
    }).catch(console.error)
  })
}

async function toggleTransaction(tx: StagingTransaction) {
  const newValue = !tx.isSelected
  tx.isSelected = newValue
  try {
    await $fetch(`/api/import/staging/${sessionId}/transactions/${tx.id}`, {
      method: 'PATCH',
      body: { isSelected: newValue },
    })
  } catch (error) {
    // Revert on failure
    tx.isSelected = !newValue
    console.error('Failed to update selection:', error)
  }
}

async function updateCategory(tx: StagingTransaction, value: string) {
  const newCategoryId = value === '' ? null : Number(value)
  const oldCategoryId = tx.categoryId
  tx.categoryId = newCategoryId
  tx.categoryName = stagingData.value?.categories.find(c => c.id === newCategoryId)?.name ?? null
  try {
    await $fetch(`/api/import/staging/${sessionId}/transactions/${tx.id}`, {
      method: 'PATCH',
      body: { categoryId: newCategoryId },
    })
  } catch (error) {
    tx.categoryId = oldCategoryId
    tx.categoryName = stagingData.value?.categories.find(c => c.id === oldCategoryId)?.name ?? null
    console.error('Failed to update category:', error)
  }
}

async function runAutoCategorize() {
  autoCategorizing.value = true
  autoCategorizeResult.value = null
  try {
    const result = await $fetch(`/api/import/staging/${sessionId}/auto-categorize`, { method: 'POST' }) as { categorized: number; total: number }
    autoCategorizeResult.value = result
    // Reload to get updated categoryIds and names
    await loadStagingData()
  } catch (error) {
    console.error('Auto-categorize failed:', error)
  } finally {
    autoCategorizing.value = false
  }
}

async function commitImport() {
  committing.value = true
  try {
    const result = await $fetch(`/api/import/staging/${sessionId}/commit`, { method: 'POST' }) as CommitResult
    commitResult.value = result
  } catch (error) {
    console.error('Commit failed:', error)
  } finally {
    committing.value = false
  }
}

function openAddCategoryModal() {
  categoryForm.value = { name: '', parentId: null, icon: '', color: '#3b82f6' }
  showCategoryModal.value = true
}

async function saveCategory() {
  if (!categoryForm.value.name) return
  try {
    await $fetch('/api/categories', { method: 'POST', body: categoryForm.value })
    showCategoryModal.value = false
    // Reload staging data to get updated categories list
    await loadStagingData()
  } catch (error) {
    console.error('Failed to create category:', error)
  }
}

function formatDate(dateStr: string): string {
  // Input is MM/DD/YYYY or YYYY-MM-DD
  if (!dateStr) return ''
  // Handle YYYY-MM-DD
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [y, m, d] = dateStr.split('-')
    return `${m}/${d}/${y.slice(2)}`
  }
  // Handle MM/DD/YYYY → MM/DD/YY
  const parts = dateStr.split('/')
  if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`
  return dateStr
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return amount < 0 ? `+$${formatted}` : `$${formatted}`
}

onMounted(loadStagingData)
</script>
