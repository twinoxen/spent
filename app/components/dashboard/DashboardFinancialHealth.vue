<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Financial Health</h2>

    <!-- No balance data state -->
    <div v-if="!summary.hasAnyBalance" class="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">No balance data yet.</p>
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Add current balances to your accounts to see your financial position here.
        <NuxtLink to="/accounts" class="text-primary-500 hover:underline ml-1">Go to Accounts →</NuxtLink>
      </p>
    </div>

    <template v-else>
      <!-- KPI row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Net Position -->
        <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Net Position</p>
          <p
            class="text-2xl font-bold tabular-nums"
            :class="summary.netPosition >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'"
          >
            {{ formatCurrency(summary.netPosition) }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">assets minus debt</p>
        </div>

        <!-- Total Assets -->
        <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Total Assets</p>
          <p class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(summary.totalAssets) }}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">checking &amp; savings</p>
        </div>

        <!-- Total Debt -->
        <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Total Debt</p>
          <p class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(summary.totalDebt) }}</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">credit card balances</p>
        </div>

        <!-- Credit Utilization -->
        <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Credit Utilization</p>
          <p
            v-if="summary.overallUtilization !== null"
            class="text-2xl font-bold tabular-nums"
            :class="utilizationTextClass(summary.overallUtilization)"
          >
            {{ formatPercent(summary.overallUtilization) }}
          </p>
          <p v-else class="text-2xl font-bold tabular-nums text-gray-400">—</p>
          <div v-if="summary.overallUtilization !== null" class="mt-2 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="utilizationBarClass(summary.overallUtilization)"
              :style="{ width: `${Math.min(summary.overallUtilization * 100, 100)}%` }"
            />
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {{ summary.overallUtilization !== null ? `${formatCurrency(summary.totalDebt)} of ${formatCurrency(summary.totalCreditLimit)}` : 'no credit accounts' }}
          </p>
        </div>
      </div>

      <!-- Per-account cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <NuxtLink
          v-for="account in accountsWithBalance"
          :key="account.id"
          :to="`/transactions?accountId=${account.id}`"
          class="block rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <!-- Account header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: account.color ?? '#6366f1' }" />
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{{ account.name }}</p>
                <p v-if="account.institution" class="text-xs text-gray-400 dark:text-gray-500">{{ account.institution }}</p>
              </div>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium flex-shrink-0">
              {{ ACCOUNT_TYPE_LABELS[account.type] ?? account.type }}
            </span>
          </div>

          <!-- Credit card layout -->
          <template v-if="account.type === 'credit_card'">
            <div class="flex items-end justify-between mb-2">
              <div>
                <p class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(account.adjustedBalance) }}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">owed</p>
              </div>
              <div class="text-right">
                <p
                  class="text-sm font-semibold tabular-nums"
                  :class="utilizationTextClass(account.utilization)"
                >
                  {{ formatPercent(account.utilization) }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500">of {{ formatCurrency(account.creditLimit) }}</p>
              </div>
            </div>
            <!-- Utilization bar -->
            <div class="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-2">
              <div
                class="h-full rounded-full transition-all"
                :class="utilizationBarClass(account.utilization)"
                :style="{ width: `${Math.min((account.utilization ?? 0) * 100, 100)}%` }"
              />
            </div>
            <!-- Alerts -->
            <div class="flex items-center justify-between">
              <p v-if="account.utilization !== null && account.utilization >= 0.75" class="text-xs text-red-500 dark:text-red-400 font-medium">
                High utilization
              </p>
              <p v-else-if="account.availableCredit !== null" class="text-xs text-gray-400 dark:text-gray-500">
                {{ formatCurrency(account.availableCredit) }} available
              </p>
              <p v-if="account.apr" class="text-xs text-gray-400 dark:text-gray-500 ml-auto">{{ account.apr }}% APR</p>
            </div>
          </template>

          <!-- Checking / Savings / Debit layout -->
          <template v-else>
            <p class="text-xl font-bold tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(account.adjustedBalance) }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">available balance</p>
            <!-- Stale balance warning -->
            <p v-if="isStaleBalance(account.balanceAsOfDate)" class="text-xs text-amber-500 dark:text-amber-400 mt-1.5">
              Balance from {{ formatDate(account.balanceAsOfDate) }} — consider updating
            </p>
          </template>
        </NuxtLink>

        <!-- Accounts without balance — prompt to set -->
        <NuxtLink
          v-for="account in accountsWithoutBalance"
          :key="`empty-${account.id}`"
          to="/accounts"
          class="block rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <div class="flex items-center gap-2.5 mb-2">
            <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: account.color ?? '#6366f1' }" />
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ account.name }}</p>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500">No balance set — click to add</p>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  debit: 'Debit',
  checking: 'Checking',
  savings: 'Savings',
}

const CREDIT_TYPES = new Set(['credit_card'])
const ASSET_TYPES = new Set(['checking', 'savings', 'debit'])

const props = defineProps<{
  accounts: any[]
}>()

const accountsWithBalance = computed(() =>
  props.accounts.filter(a => a.adjustedBalance !== null)
)

const accountsWithoutBalance = computed(() =>
  props.accounts.filter(a => a.adjustedBalance === null)
)

const summary = computed(() => {
  let totalAssets = 0
  let totalDebt = 0
  let totalCreditLimit = 0
  let hasAnyBalance = false

  for (const account of props.accounts) {
    if (account.adjustedBalance === null) continue
    hasAnyBalance = true
    if (CREDIT_TYPES.has(account.type)) {
      totalDebt += account.adjustedBalance
      if (account.creditLimit) totalCreditLimit += account.creditLimit
    } else if (ASSET_TYPES.has(account.type)) {
      totalAssets += account.adjustedBalance
    }
  }

  return {
    hasAnyBalance,
    totalAssets,
    totalDebt,
    totalCreditLimit,
    netPosition: totalAssets - totalDebt,
    overallUtilization: totalCreditLimit > 0 ? totalDebt / totalCreditLimit : null,
  }
})

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${Math.round(value * 100)}%`
}

function utilizationTextClass(utilization: number | null | undefined): string {
  if (utilization == null) return 'text-gray-400'
  if (utilization >= 0.75) return 'text-red-500 dark:text-red-400'
  if (utilization >= 0.5) return 'text-amber-500 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

function utilizationBarClass(utilization: number | null | undefined): string {
  if (utilization == null) return 'bg-gray-300 dark:bg-gray-600'
  if (utilization >= 0.75) return 'bg-red-500'
  if (utilization >= 0.5) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function isStaleBalance(balanceAsOfDate: string | null): boolean {
  if (!balanceAsOfDate) return false
  const then = new Date(balanceAsOfDate + 'T00:00:00')
  const now = new Date()
  const diffDays = (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays > 30
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
