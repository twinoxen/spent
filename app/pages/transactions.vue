<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
      <UButton label="Add Transaction" color="primary" icon="i-heroicons-plus" @click="openAddModal" />
    </div>

    <!-- Add Transaction Modal -->
    <UModal v-model:open="showAddModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">Add Transaction</p>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date <span class="text-red-500">*</span></label>
                <input
                  v-model="newTx.transactionDate"
                  type="date"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type <span class="text-red-500">*</span></label>
                <select
                  v-model="newTx.type"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Purchase">Purchase</option>
                  <option value="Payment">Payment</option>
                  <option value="Installment">Installment</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description <span class="text-red-500">*</span></label>
              <input
                v-model="newTx.description"
                type="text"
                placeholder="e.g. Coffee at Blue Bottle"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount ($) <span class="text-red-500">*</span></label>
                <input
                  v-model="newTx.amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Account <span class="text-red-500">*</span></label>
                <select
                  v-model="newTx.accountId"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option :value="null" disabled>Select account…</option>
                  <option v-for="account in availableAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Merchant</label>
                <input
                  v-model="newTx.merchantName"
                  type="text"
                  placeholder="e.g. Blue Bottle Coffee"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Purchased By</label>
                <input
                  v-model="newTx.purchasedBy"
                  type="text"
                  placeholder="e.g. Jonathan"
                  list="purchasers-list"
                  class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <datalist id="purchasers-list">
                  <option v-for="person in uniquePurchasers" :key="person" :value="person" />
                </datalist>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                v-model="newTx.categoryId"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">No Category</option>
                <template v-for="parent in categoryTree" :key="parent.id">
                  <optgroup v-if="parent.children.length > 0" :label="[parent.icon, parent.name].filter(Boolean).join(' ')">
                    <option v-for="child in parent.children" :key="child.id" :value="String(child.id)">{{ child.name }}</option>
                  </optgroup>
                  <option v-else :value="String(parent.id)">{{ [parent.icon, parent.name].filter(Boolean).join(' ') }}</option>
                </template>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                v-model="newTx.notes"
                rows="2"
                placeholder="Optional notes…"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <p v-if="addError" class="text-sm text-red-500">{{ addError }}</p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showAddModal = false" />
              <UButton label="Add Transaction" color="primary" :loading="addLoading" @click="submitTransaction" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search description..."
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @input="debouncedLoadTransactions"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Category</label>
          <select
            v-model="filters.categoryId"
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @change="loadTransactions"
          >
            <option :value="null">All Categories</option>
            <template v-for="parent in categoryTree" :key="parent.id">
              <optgroup v-if="parent.children.length > 0" :label="[parent.icon, parent.name].filter(Boolean).join(' ')">
                <option v-for="child in parent.children" :key="child.id" :value="String(child.id)">{{ child.name }}</option>
              </optgroup>
              <option v-else :value="String(parent.id)">{{ [parent.icon, parent.name].filter(Boolean).join(' ') }}</option>
            </template>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Purchased By</label>
          <select
            v-model="filters.purchasedBy"
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @change="loadTransactions"
          >
            <option :value="null">All</option>
            <option v-for="person in uniquePurchasers" :key="person" :value="person">{{ person }}</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Type</label>
          <select
            v-model="filters.type"
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @change="loadTransactions"
          >
            <option :value="null">All Types</option>
            <option value="Purchase">Purchase</option>
            <option value="Payment">Payment</option>
            <option value="Installment">Installment</option>
          </select>
        </div>

        <div v-if="availableAccounts.length > 0">
          <label class="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Account</label>
          <select
            v-model="filters.accountId"
            class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            @change="loadTransactions"
          >
            <option :value="null">All Accounts</option>
            <option v-for="account in availableAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </div>
      </div>

      <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div class="flex items-center gap-2.5 flex-wrap">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Showing <span class="font-semibold text-gray-700 dark:text-gray-200">{{ transactions.length }}</span> of <span class="font-semibold text-gray-700 dark:text-gray-200">{{ total }}</span> transactions
          </p>
          <!-- Active date chip from calendar -->
          <span
            v-if="filters.date"
            class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium"
          >
            <UIcon name="i-heroicons-calendar-days" class="w-3 h-3 flex-shrink-0" />
            {{ formatDateDisplay(filters.date) }}
            <button
              class="ml-0.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
              @click="filters.date = null; loadTransactions()"
            >
              <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
            </button>
          </span>
        </div>
        <UButton label="Clear Filters" color="neutral" variant="ghost" size="sm" @click="clearFilters" />
      </div>
    </UCard>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-16">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
    </div>

    <!-- Transactions Table -->
    <UCard v-else>
      <div class="overflow-x-auto -mx-4 sm:-mx-6">
        <table class="w-full min-w-[700px]">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Merchant</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Purchased By</th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Account</th>
              <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="transaction in transactions"
              :key="transaction.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                {{ formatDate(transaction.transactionDate) }}
              </td>
              <td class="px-6 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-[200px]">
                <span class="block truncate" :title="transaction.description">{{ transaction.description }}</span>
              </td>
              <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                {{ transaction.merchant?.name || '—' }}
              </td>
              <td class="px-6 py-3 whitespace-nowrap text-sm">
                <select
                  :value="transaction.category?.id ? String(transaction.category.id) : ''"
                  class="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 border border-transparent text-gray-700 dark:text-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 w-40"
                  @change="(e) => updateCategory(transaction.id, (e.target as HTMLSelectElement).value)"
                >
                  <option value="">Uncategorized</option>
                  <template v-for="parent in categoryTree" :key="parent.id">
                    <optgroup v-if="parent.children.length > 0" :label="[parent.icon, parent.name].filter(Boolean).join(' ')">
                      <option v-for="child in parent.children" :key="child.id" :value="String(child.id)">{{ child.name }}</option>
                    </optgroup>
                    <option v-else :value="String(parent.id)">{{ [parent.icon, parent.name].filter(Boolean).join(' ') }}</option>
                  </template>
                </select>
              </td>
              <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                {{ transaction.purchasedBy }}
              </td>
              <td class="px-6 py-3 whitespace-nowrap text-sm">
                <span
                  v-if="transaction.account"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  :style="{ backgroundColor: transaction.account.color }"
                >
                  {{ transaction.account.name }}
                </span>
              </td>
              <td
                class="px-6 py-3 whitespace-nowrap text-sm text-right font-semibold tabular-nums"
                :class="transaction.type === 'Payment' ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-900 dark:text-white'"
              >
                {{ transaction.type === 'Payment' ? '−' : '' }}{{ formatCurrency(Math.abs(transaction.amount)) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="transactions.length === 0" class="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
          No transactions found
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
</template>

<script setup lang="ts">
const route = useRoute()

const loading = ref(true)
const transactions = ref<any[]>([])
const allCategories = ref<any[]>([])
const categoryTree = ref<any[]>([])
const total = ref(0)
const limit = ref(50)
const offset = ref(0)

// Add Transaction modal
const showAddModal = ref(false)
const addLoading = ref(false)
const addError = ref<string | null>(null)

function defaultNewTx() {
  return {
    transactionDate: new Date().toISOString().split('T')[0],
    description: '',
    type: 'Purchase',
    amount: null as number | null,
    accountId: null as number | null,
    merchantName: '',
    purchasedBy: '',
    categoryId: '' as string,
    notes: '',
  }
}

const newTx = ref(defaultNewTx())

function openAddModal() {
  newTx.value = defaultNewTx()
  addError.value = null
  showAddModal.value = true
}

async function submitTransaction() {
  addError.value = null
  if (!newTx.value.transactionDate || !newTx.value.description || !newTx.value.type || newTx.value.amount == null || !newTx.value.accountId) {
    addError.value = 'Please fill in all required fields.'
    return
  }

  addLoading.value = true
  try {
    await $fetch('/api/transactions', {
      method: 'POST',
      body: {
        accountId: newTx.value.accountId,
        transactionDate: newTx.value.transactionDate,
        description: newTx.value.description,
        type: newTx.value.type,
        amount: Number(newTx.value.amount),
        merchantName: newTx.value.merchantName || undefined,
        purchasedBy: newTx.value.purchasedBy || undefined,
        categoryId: newTx.value.categoryId ? Number(newTx.value.categoryId) : undefined,
        notes: newTx.value.notes || undefined,
      },
    })
    showAddModal.value = false
    offset.value = 0
    await loadTransactions()
  } catch (err: any) {
    addError.value = err?.data?.message ?? 'Failed to add transaction.'
  } finally {
    addLoading.value = false
  }
}

const filters = ref({
  search: null as string | null,
  categoryId: route.query.categoryId ? String(route.query.categoryId) : null as string | null,
  purchasedBy: null as string | null,
  type: null as string | null,
  accountId: route.query.accountId ? Number(route.query.accountId) : null as number | null,
  date: route.query.date ? String(route.query.date) : null as string | null,
})

const uniquePurchasers = ref<string[]>([])
const availableAccounts = ref<any[]>([])

const currentPage = computed(() => Math.floor(offset.value / limit.value) + 1)
const totalPages = computed(() => Math.ceil(total.value / limit.value))


async function loadTransactions() {
  loading.value = true
  try {
    const params: any = { limit: limit.value, offset: offset.value }
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.categoryId) params.categoryId = Number(filters.value.categoryId)
    if (filters.value.purchasedBy) params.purchasedBy = filters.value.purchasedBy
    if (filters.value.type) params.type = filters.value.type
    if (filters.value.accountId) params.accountId = filters.value.accountId
    if (filters.value.date) params.date = filters.value.date

    const data = await $fetch('/api/transactions', { params })
    transactions.value = data.transactions
    total.value = data.total
  } catch (error) {
    console.error('Failed to load transactions:', error)
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const data = await $fetch('/api/categories')
    allCategories.value = data.categories
    categoryTree.value = data.tree
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

async function loadPurchasers() {
  try {
    const data = await $fetch('/api/transactions/stats')
    uniquePurchasers.value = data.spendByPurchaser.map((p: any) => p.purchasedBy).filter(Boolean)
  } catch (error) {
    console.error('Failed to load purchasers:', error)
  }
}

async function loadAccounts() {
  try {
    availableAccounts.value = await $fetch('/api/accounts')
  } catch (error) {
    console.error('Failed to load accounts:', error)
  }
}

async function updateCategory(transactionId: number, value: string) {
  const categoryId = value ? Number(value) : null
  try {
    await $fetch(`/api/transactions/${transactionId}`, {
      method: 'PATCH',
      body: { categoryId },
    })
    // Optimistic local update — no full reload needed
    const tx = transactions.value.find(t => t.id === transactionId)
    if (tx) {
      tx.category = categoryId
        ? allCategories.value.find(c => c.id === categoryId) ?? null
        : null
    }
  } catch (error) {
    console.error('Failed to update category:', error)
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

function clearFilters() {
  filters.value = { search: null, categoryId: null, purchasedBy: null, type: null, accountId: null, date: null }
  offset.value = 0
  loadTransactions()
}

function formatDateDisplay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function nextPage() {
  offset.value += limit.value
  loadTransactions()
}

function previousPage() {
  offset.value = Math.max(0, offset.value - limit.value)
  loadTransactions()
}

let debounceTimer: NodeJS.Timeout | null = null
function debouncedLoadTransactions() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    offset.value = 0
    loadTransactions()
  }, 500)
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadPurchasers(), loadAccounts(), loadTransactions()])
})
</script>
