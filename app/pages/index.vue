<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <UButton label="Import" color="primary" icon="i-heroicons-arrow-up-tray" @click="$router.push('/import')" />
    </div>

    <DashboardFilterBar
      :date-ranges="DATE_RANGES"
      :date-range="dateRange"
      :is-latest-period="isLatestPeriod"
      :period-label="periodLabel"
      :available-purchasers="availablePurchasers"
      :selected-person="selectedPerson"
      :available-accounts="availableAccounts"
      :selected-account-ids="selectedAccountIds"
      :loading="loading"
      :has-stats="!!stats"
      @set-date-range="setDateRange"
      @shift-range="shiftRange"
      @toggle-person="togglePerson"
      @toggle-account="toggleAccount"
    />

    <!-- Initial Load -->
    <div v-if="loading && !stats" class="flex justify-center py-24">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="stats" class="space-y-6 transition-opacity duration-200" :class="{ 'opacity-50 pointer-events-none': loading }">

      <DashboardKpiRow
        :total-spend="stats.totalSpend"
        :total-income="stats.totalIncome"
        :transaction-count="transactionCount"
        :uncategorized-count="uncategorizedCount"
        :date-range-label="dateRangeLabel"
        :avg-monthly="avgMonthly"
      />

      <DashboardSpendByCategory
        :data="stats.spendByCategory"
        :date-range-label="dateRangeLabel"
        @select="goToCategory"
        @drilldown="onDrilldown"
      />

      <DashboardTopMerchants
        :merchants="filteredMerchants"
        :loading="merchantsLoading"
        :drilled-category="drilledCategory"
      />

      <DashboardSpendOverTime
        :data="stats.spendOverTime"
        @month-click="navigateToMonth"
      />

      <DashboardDailySpending
        :purchased-by="selectedPerson"
        :account-ids="selectedAccountIds"
        :date-range="dateRange"
        :start-date="dateRangeParams.startDate"
        :end-date="dateRangeParams.endDate"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
const DATE_RANGES = [
  { label: '1M', value: '30' },
  { label: '3M', value: '90' },
  { label: '6M', value: '180' },
  { label: '1Y', value: '365' },
  { label: 'All', value: 'all' },
]

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

function navigateToMonth(month: string) {
  const [year, monthNum] = month.split('-')
  if (!year || !monthNum) return
  const start = `${year}-${monthNum}-01`
  const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate()
  const end = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`
  navigateTo(`/transactions?startDate=${start}&endDate=${end}`)
}

function goToCategory(categoryId: number | null) {
  if (categoryId) navigateTo(`/transactions?categoryId=${categoryId}`)
}

onMounted(() => {
  loadAccounts()
  loadStats()
})
</script>
