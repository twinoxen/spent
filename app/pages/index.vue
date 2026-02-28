<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <UButton label="Import" color="primary" icon="i-heroicons-arrow-up-tray" @click="$router.push('/import')" />
    </div>

    <!-- Filter Bar -->
    <UCard class="mb-6">
      <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
        <!-- Date Range Segments -->
        <div class="flex items-center gap-2.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Range</span>
          <div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
            <button
              v-for="range in DATE_RANGES"
              :key="range.value"
              class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
              :class="dateRange === range.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
              @click="setDateRange(range.value)"
            >
              {{ range.label }}
            </button>
          </div>
        </div>

        <!-- Period Navigator (hidden for All) -->
        <template v-if="dateRange !== 'all'">
          <div class="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <div class="flex items-center gap-0.5">
            <button
              class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
              @click="shiftRange(-1)"
            >
              <UIcon name="i-heroicons-chevron-left" class="w-3.5 h-3.5" />
            </button>
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 px-1 min-w-[9rem] text-center tabular-nums">
              {{ periodLabel }}
            </span>
            <button
              class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="isLatestPeriod"
              @click="shiftRange(1)"
            >
              <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>

        <div class="h-5 w-px bg-gray-200 dark:bg-gray-700" />

        <!-- Person Toggles -->
        <div v-if="availablePurchasers.length > 0" class="flex items-center gap-2.5">
          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Person</span>
          <div class="flex gap-1.5">
            <button
              v-for="person in availablePurchasers"
              :key="person"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
              :class="selectedPerson === person
                ? 'border-transparent text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-transparent'"
              :style="selectedPerson === person ? { backgroundColor: personColor(person) } : {}"
              @click="togglePerson(person)"
            >
              <span
                class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                :style="{ backgroundColor: selectedPerson === person ? 'rgba(255,255,255,0.3)' : personColor(person) }"
              >
                {{ person[0] }}
              </span>
              {{ person.split(' ')[0] }}
            </button>
          </div>
        </div>

        <!-- Account Toggles -->
        <div v-if="availableAccounts.length > 0" class="flex items-center gap-2.5">
          <div class="h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <span class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Account</span>
          <div class="flex gap-1.5">
            <button
              v-for="account in availableAccounts"
              :key="account.id"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
              :class="selectedAccountIds.includes(account.id)
                ? 'border-transparent text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-transparent'"
              :style="selectedAccountIds.includes(account.id) ? { backgroundColor: account.color } : {}"
              @click="toggleAccount(account.id)"
            >
              <span
                class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                :style="{ backgroundColor: selectedAccountIds.includes(account.id) ? 'rgba(255,255,255,0.3)' : account.color }"
              >
                {{ account.name[0] }}
              </span>
              {{ account.name }}
            </button>
          </div>
        </div>

        <!-- Loading spinner -->
        <div v-if="loading && stats" class="ml-auto flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <div class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-500" />
          Updating…
        </div>
      </div>
    </UCard>

    <!-- Initial Load -->
    <div v-if="loading && !stats" class="flex justify-center py-24">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="stats" class="space-y-6 transition-opacity duration-200" :class="{ 'opacity-50 pointer-events-none': loading }">

      <!-- KPI Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard>
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Spend</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{{ formatCurrency(stats.totalSpend) }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ dateRangeLabel }}</p>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Monthly Avg</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{{ formatCurrency(avgMonthly) }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">per month</p>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Transactions</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{{ transactionCount }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500">purchases</p>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Uncategorized</p>
            <p class="text-2xl font-bold tabular-nums" :class="uncategorizedCount > 0 ? 'text-amber-500' : 'text-emerald-500'">
              {{ uncategorizedCount }}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500">{{ uncategorizedCount > 0 ? 'need review' : 'all tagged' }}</p>
          </div>
        </UCard>
      </div>

      <!-- Spending by Category -->
      <UCard>
        <template #header>
          <div>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Spending by Category</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ dateRangeLabel }} · click a category to filter</p>
          </div>
        </template>
        <div class="h-96">
          <SpendByCategory v-if="stats.spendByCategory.length > 0" :data="stats.spendByCategory" @select="goToCategory" @drilldown="onDrilldown" />
          <div v-else class="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
            No data for this period
          </div>
        </div>
      </UCard>

      <!-- Top Merchants -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-1.5">
              <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Top Merchants</p>
              <template v-if="drilledCategory">
                <span class="text-gray-300 dark:text-gray-600 text-xs">/</span>
                <span
                  class="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full"
                  :style="drilledCategory.categoryColor ? { backgroundColor: drilledCategory.categoryColor + '22', color: drilledCategory.categoryColor } : {}"
                >
                  {{ drilledCategory.categoryName }}
                </span>
              </template>
            </div>
            <div v-if="merchantsLoading" class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-500" />
            </div>
          </div>
        </template>
        <div v-if="filteredMerchants.length > 0" class="space-y-0.5">
          <div
            v-for="(merchant, i) in filteredMerchants.slice(0, 8)"
            :key="merchant.merchantId ?? i"
            class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <span class="text-xs font-mono text-gray-300 dark:text-gray-600 w-4 text-right flex-shrink-0">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ merchant.merchantName || 'Unknown' }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500">{{ merchant.count }} txn{{ merchant.count !== 1 ? 's' : '' }}</p>
            </div>
            <span class="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{{ formatCurrency(merchant.total) }}</span>
          </div>
        </div>
        <div v-else class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No merchants found</div>
      </UCard>

      <!-- Spending Over Time -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Spending Over Time</p>
        </template>
        <div class="h-56">
          <SpendOverTime v-if="stats.spendOverTime.length > 0" :data="stats.spendOverTime" />
          <div v-else class="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
            No data for this period
          </div>
        </div>
      </UCard>

      <!-- Daily Spending Heatmap -->
      <UCard>
        <template #header>
          <div>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Daily Spending</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Heat map — darker means more spent</p>
          </div>
        </template>
        <SpendingCalendar
          :purchased-by="selectedPerson"
          :account-ids="selectedAccountIds"
          :date-range="dateRange"
          :start-date="dateRangeParams.startDate"
          :end-date="dateRangeParams.endDate"
        />
      </UCard>

    </div>
  </div>
</template>

<script setup lang="ts">
import SpendByCategory from '~/components/charts/SpendByCategory.vue'
import SpendOverTime from '~/components/charts/SpendOverTime.vue'
import SpendingCalendar from '~/components/charts/SpendingCalendar.vue'

const DATE_RANGES = [
  { label: '1M', value: '30' },
  { label: '3M', value: '90' },
  { label: '6M', value: '180' },
  { label: '1Y', value: '365' },
  { label: 'All', value: 'all' },
]

const PERSON_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']

const dateRange = ref('all')
const rangeOffset = ref(0) // 0 = current period, -1 = one period back, etc.
const selectedPerson = ref<string | null>(null)
const selectedAccountIds = ref<number[]>([])
const loading = ref(true)
const stats = ref<any>(null)
const availablePurchasers = ref<string[]>([])
const availableAccounts = ref<any[]>([])
const drilledCategory = ref<{ categoryId: number | null; categoryName: string | null; categoryColor: string | null } | null>(null)
const merchantsLoading = ref(false)
const filteredMerchants = ref<any[]>([])

function personColor(name: string | null): string {
  if (!name) return '#6b7280'
  const idx = availablePurchasers.value.indexOf(name)
  return PERSON_COLORS[idx % PERSON_COLORS.length] ?? '#6b7280'
}

// How many months each range steps per arrow click
const stepMonths = computed<number>(() => ({ '30': 1, '90': 3, '180': 6, '365': 12 }[dateRange.value] ?? 1))

// Sliding window dates derived from the current range + offset
const windowDates = computed<{ startDate?: string; endDate?: string }>(() => {
  if (dateRange.value === 'all') return {}
  const now = new Date()
  const step = stepMonths.value
  // Last day of (current month shifted by offset * step months)
  const end = new Date(now.getFullYear(), now.getMonth() + rangeOffset.value * step + 1, 0)
  // First day of the window
  const start = new Date(end.getFullYear(), end.getMonth() - (step - 1), 1)
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
})

const dateRangeParams = computed<{ startDate?: string; endDate?: string }>(() => windowDates.value)

const isLatestPeriod = computed(() => rangeOffset.value === 0)

// Label shown in the period navigator: "January 2026" for 1M, "Nov 2025 – Jan 2026" for wider ranges
const periodLabel = computed(() => {
  const { startDate, endDate } = windowDates.value
  if (!startDate || !endDate) return ''
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  if (stepMonths.value === 1) {
    return end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  return (
    start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    + ' – '
    + end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  )
})

const dateRangeLabel = computed(() => {
  if (dateRange.value === 'all') return 'All time'
  return periodLabel.value
})

const avgMonthly = computed(() => {
  if (!stats.value) return 0
  const months = stats.value.spendOverTime.length
  return months > 1 ? stats.value.totalSpend / months : stats.value.totalSpend
})

const transactionCount = computed(() =>
  stats.value?.spendByCategory.reduce((sum: number, c: any) => sum + Number(c.count), 0) ?? 0
)

const uncategorizedCount = computed(() => {
  const u = stats.value?.spendByCategory.find((c: any) => c.categoryId === null)
  return Number(u?.count ?? 0)
})


function buildStatsParams(extra: Record<string, any> = {}) {
  const params: any = { ...dateRangeParams.value }
  if (selectedPerson.value) params.purchasedBy = selectedPerson.value
  if (selectedAccountIds.value.length > 0) params.accountIds = selectedAccountIds.value.join(',')
  return { ...params, ...extra }
}

async function loadAccounts() {
  try {
    availableAccounts.value = await $fetch('/api/accounts')
  } catch (error) {
    console.error('Failed to load accounts:', error)
  }
}

async function loadStats() {
  loading.value = true
  try {
    const data = await $fetch('/api/transactions/stats', { params: buildStatsParams() })
    stats.value = data

    // Populate person list on first load only (so toggles don't disappear when filtering)
    if (availablePurchasers.value.length === 0) {
      availablePurchasers.value = data.spendByPurchaser.map((p: any) => p.purchasedBy).filter(Boolean)
    }

    // Refresh filtered merchants too if a category is drilled into
    await loadMerchants(drilledCategory.value?.categoryId ?? undefined)
  } catch (error) {
    console.error('Failed to load stats:', error)
  } finally {
    loading.value = false
  }
}

async function loadMerchants(categoryId?: number | null) {
  merchantsLoading.value = true
  try {
    const params = buildStatsParams(categoryId != null ? { categoryId } : {})
    const data = await $fetch('/api/transactions/stats', { params })
    filteredMerchants.value = data.topMerchants
  } catch (error) {
    console.error('Failed to load merchants:', error)
  } finally {
    merchantsLoading.value = false
  }
}

function onDrilldown(item: { categoryId: number | null; categoryName: string | null; categoryColor: string | null } | null) {
  drilledCategory.value = item
  loadMerchants(item?.categoryId)
}

function setDateRange(value: string) {
  dateRange.value = value
  rangeOffset.value = 0
  loadStats()
}

function shiftRange(direction: -1 | 1) {
  rangeOffset.value += direction
  loadStats()
}

function togglePerson(person: string) {
  selectedPerson.value = selectedPerson.value === person ? null : person
  loadStats()
}

function toggleAccount(accountId: number) {
  const idx = selectedAccountIds.value.indexOf(accountId)
  if (idx === -1) {
    selectedAccountIds.value = [...selectedAccountIds.value, accountId]
  } else {
    selectedAccountIds.value = selectedAccountIds.value.filter(id => id !== accountId)
  }
  loadStats()
}

function goToCategory(categoryId: number | null) {
  if (categoryId) navigateTo(`/transactions?categoryId=${categoryId}`)
}

onMounted(() => {
  loadAccounts()
  loadStats()
})
</script>
