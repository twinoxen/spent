<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Review Uncategorized</h1>
      <div class="flex items-center gap-2">
        <UButton
          label="Suggest Categories"
          color="neutral"
          variant="soft"
          icon="i-heroicons-light-bulb"
          :loading="isFetching"
          :disabled="transactions.length === 0"
          @click="fetchSuggestions"
        />
        <UButton
          label="Auto-Categorize"
          color="primary"
          variant="soft"
          icon="i-heroicons-sparkles"
          :loading="autoCategorizing"
          @click="runAutoCategorize"
        />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>

    <div v-else-if="transactions.length === 0" class="text-center py-20">
      <svg class="w-20 h-20 mx-auto text-emerald-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">All Caught Up!</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-8">All your transactions have been categorized.</p>
      <UButton label="View Dashboard" color="primary" @click="$router.push('/')" />
    </div>

    <div v-else class="space-y-5">
      <!-- Summary + Bulk Actions -->
      <UCard>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex gap-6">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Uncategorized</p>
              <p class="text-2xl font-bold text-amber-500">{{ total }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Amount</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatCurrency(totalAmount) }}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ selectedTransactions.size }} selected</span>
            <select
              v-model="bulkCategoryId"
              class="px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option :value="null">Select category…</option>
              <optgroup v-for="parent in categoryTree" :key="parent.id" :label="parent.name">
                <option :value="parent.id">{{ parent.name }}</option>
                <option v-for="child in parent.children" :key="child.id" :value="child.id">
                  &nbsp;&nbsp;{{ child.name }}
                </option>
              </optgroup>
            </select>
            <UButton
              label="Apply to Selected"
              color="primary"
              size="sm"
              :disabled="!bulkCategoryId || selectedTransactions.size === 0"
              @click="bulkCategorize"
            />
          </div>
        </div>
      </UCard>

      <!-- Transaction Cards -->
      <UCard>
        <div class="space-y-3">
          <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="p-4 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            :class="selectedTransactions.has(transaction.id) ? 'border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-900/10' : ''"
          >
            <div class="flex items-start gap-4">
              <input
                type="checkbox"
                :checked="selectedTransactions.has(transaction.id)"
                class="mt-1.5 rounded accent-primary-500"
                @change="toggleSelection(transaction.id)"
              />

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-4 mb-3">
                  <div class="min-w-0">
                    <p class="font-semibold text-gray-900 dark:text-white truncate">{{ transaction.description }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ transaction.merchant?.name || 'Unknown Merchant' }}
                      <span class="mx-1.5 text-gray-300 dark:text-gray-600">•</span>
                      {{ formatDate(transaction.transactionDate) }}
                    </p>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="text-lg font-bold text-gray-900 dark:text-white tabular-nums">{{ formatCurrency(transaction.amount) }}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">{{ transaction.purchasedBy }}</p>
                  </div>
                </div>

                <!-- Category Selector -->
                <div class="flex items-center gap-3 flex-wrap">
                  <select
                    :value="transaction.category?.id || ''"
                    class="flex-1 min-w-[200px] px-3 py-1.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    @change="updateCategory(transaction.id, $event)"
                  >
                    <option value="">Select category…</option>
                    <optgroup v-for="parent in categoryTree" :key="parent.id" :label="parent.name">
                      <option :value="parent.id">{{ parent.name }}</option>
                      <option v-for="child in parent.children" :key="child.id" :value="child.id">
                        &nbsp;&nbsp;{{ child.name }}
                      </option>
                    </optgroup>
                  </select>

                  <UButton label="Skip" color="neutral" variant="ghost" size="sm" @click="skipTransaction(transaction.id)" />
                </div>

                <!-- Suggestions -->
                <div v-if="transaction.suggestedCategories?.length > 0" class="mt-2.5 flex flex-wrap gap-1.5">
                  <span class="text-xs text-gray-400 dark:text-gray-500 self-center">Suggestions:</span>
                  <button
                    v-for="suggested in transaction.suggestedCategories"
                    :key="suggested.id"
                    class="px-2.5 py-0.5 text-xs rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                    @click="quickAssign(transaction.id, suggested.id)"
                  >
                    {{ suggested.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="total > limit" class="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <UButton label="Previous" color="neutral" variant="outline" size="sm" :disabled="offset === 0" @click="previousPage" />
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Page <span class="font-semibold text-gray-800 dark:text-gray-200">{{ currentPage }}</span> of <span class="font-semibold text-gray-800 dark:text-gray-200">{{ totalPages }}</span>
          </span>
          <UButton label="Next" color="neutral" variant="outline" size="sm" :disabled="offset + limit >= total" @click="nextPage" />
        </div>
      </UCard>
    </div>
  </div>

  <!-- Category Suggestions Modal -->
  <UModal v-model:open="isModalOpen" :ui="{ width: 'max-w-2xl' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-base font-semibold text-gray-800 dark:text-gray-100">Suggested New Categories</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Toggle which categories to create, then apply.</p>
            </div>
            <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="closeModal" />
          </div>
        </template>

        <div v-if="suggestions.length === 0" class="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
          No suggestions available for the current uncategorized transactions.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(suggestion, index) in suggestions"
            :key="suggestion.name"
            class="p-4 rounded-lg border transition-colors cursor-pointer"
            :class="suggestion.approved
              ? 'border-primary-300 dark:border-primary-700 bg-primary-50/40 dark:bg-primary-900/10'
              : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 opacity-60'"
            @click="toggleApproval(index)"
          >
            <div class="flex items-start gap-3">
              <input
                type="checkbox"
                :checked="suggestion.approved"
                class="mt-1 rounded accent-primary-500 cursor-pointer"
                @click.stop
                @change="toggleApproval(index)"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-lg leading-none">{{ suggestion.icon }}</span>
                  <p class="font-semibold text-gray-900 dark:text-white">{{ suggestion.name }}</p>
                  <span
                    class="w-3 h-3 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: suggestion.color }"
                  />
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{{ suggestion.rationale }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="pattern in suggestion.patterns"
                    :key="pattern"
                    class="px-2 py-0.5 text-xs font-mono rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >{{ pattern }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="suggestionError" class="mt-3 text-sm text-red-500 dark:text-red-400">{{ suggestionError }}</div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="closeModal" />
            <UButton
              label="Apply Approved"
              color="primary"
              :disabled="!hasApproved"
              :loading="isApplying"
              @click="handleApply"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const {
  isModalOpen,
  isFetching,
  isApplying,
  suggestions,
  hasApproved,
  error: suggestionError,
  fetchSuggestions,
  applyApproved,
  toggleApproval,
  closeModal,
} = useCategorySuggestions()

const loading = ref(true)
const transactions = ref<any[]>([])
const categories = ref<any[]>([])
const categoryTree = ref<any[]>([])
const total = ref(0)
const limit = ref(20)
const offset = ref(0)

const selectedTransactions = ref(new Set<number>())
const bulkCategoryId = ref<number | null>(null)
const autoCategorizing = ref(false)

const totalAmount = computed(() => transactions.value.reduce((sum, t) => sum + t.amount, 0))
const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const totalPages = computed(() => Math.ceil(total.value / limit.value))

async function loadTransactions() {
  loading.value = true
  try {
    const data = await $fetch('/api/transactions', {
      params: { uncategorizedOnly: true, limit: limit.value, offset: offset.value },
    })
    transactions.value = data.transactions
    total.value = data.total
    selectedTransactions.value.clear()
  } catch (error) {
    console.error('Failed to load transactions:', error)
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const data = await $fetch('/api/categories')
    categories.value = data.categories
    categoryTree.value = data.tree
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

async function updateCategory(transactionId: number, event: Event) {
  const target = event.target as HTMLSelectElement
  const categoryId = target.value ? Number(target.value) : null
  if (!categoryId) return
  try {
    await $fetch(`/api/transactions/${transactionId}`, { method: 'PATCH', body: { categoryId } })
    transactions.value = transactions.value.filter(t => t.id !== transactionId)
    total.value--
  } catch (error) {
    console.error('Failed to update category:', error)
  }
}

async function quickAssign(transactionId: number, categoryId: number) {
  try {
    await $fetch(`/api/transactions/${transactionId}`, { method: 'PATCH', body: { categoryId } })
    transactions.value = transactions.value.filter(t => t.id !== transactionId)
    total.value--
  } catch (error) {
    console.error('Failed to assign category:', error)
  }
}

function skipTransaction(transactionId: number) {
  transactions.value = transactions.value.filter(t => t.id !== transactionId)
  selectedTransactions.value.delete(transactionId)
}

function toggleSelection(transactionId: number) {
  if (selectedTransactions.value.has(transactionId)) {
    selectedTransactions.value.delete(transactionId)
  } else {
    selectedTransactions.value.add(transactionId)
  }
}

async function bulkCategorize() {
  if (!bulkCategoryId.value || selectedTransactions.value.size === 0) return
  const categoryId = bulkCategoryId.value
  const ids = Array.from(selectedTransactions.value)
  try {
    await Promise.all(ids.map(id => $fetch(`/api/transactions/${id}`, { method: 'PATCH', body: { categoryId } })))
    transactions.value = transactions.value.filter(t => !ids.includes(t.id))
    total.value -= ids.length
    selectedTransactions.value.clear()
    bulkCategoryId.value = null
  } catch (error) {
    console.error('Failed to bulk categorize:', error)
  }
}

async function runAutoCategorize() {
  if (autoCategorizing.value) return
  autoCategorizing.value = true
  const toast = useToast()
  toast.add({
    id: 'auto-categorize-progress',
    title: 'Auto-categorizing…',
    description: 'Matching transactions against your rules. This may take a moment.',
    color: 'info',
    duration: 0,
  })
  try {
    const result = await $fetch('/api/transactions/auto-categorize', { method: 'POST' })
    await loadTransactions()
    toast.remove('auto-categorize-progress')
    if (result.categorized > 0) {
      toast.add({
        title: 'Auto-categorization complete',
        description: `${result.categorized} of ${result.total} transactions were categorized.`,
        color: 'success',
      })
    } else {
      toast.add({
        title: 'No matches found',
        description: 'No transactions could be auto-categorized with the current rules.',
        color: 'neutral',
      })
    }
  } catch (error) {
    console.error('Auto-categorization failed:', error)
    toast.remove('auto-categorize-progress')
    toast.add({ title: 'Auto-categorization failed', color: 'error' })
  } finally {
    autoCategorizing.value = false
  }
}

async function handleApply() {
  const toast = useToast()
  const result = await applyApproved()
  if (result) {
    await loadTransactions()
    toast.add({
      title: 'Categories applied',
      description: `Created ${result.created} categor${result.created === 1 ? 'y' : 'ies'} and categorized ${result.categorized} transaction${result.categorized === 1 ? '' : 's'}.`,
      color: 'success',
    })
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  // ISO format: YYYY-MM-DD (from PDF imports)
  if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-')
    return `${m}/${d}/${y}`
  }
  // Legacy MM/DD/YYYY format (from CSV imports)
  return dateStr
}

function nextPage() {
  offset.value += limit.value
  loadTransactions()
}

function previousPage() {
  offset.value = Math.max(0, offset.value - limit.value)
  loadTransactions()
}

onMounted(async () => {
  await loadCategories()
  await loadTransactions()
})
</script>
