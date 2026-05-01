<template>
  <div class="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
    <div class="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 class="text-lg font-semibold text-gray-700 dark:text-gray-200">Available to Spend</h2>
        <p class="text-xs text-gray-400 dark:text-gray-500">Calculated balance minus bills and active reserves</p>
      </div>
      <UButton label="Manage Reserves" size="sm" color="primary" variant="soft" to="/reserves" />
    </div>

    <div v-if="loading" class="py-8 flex justify-center">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
    </div>

    <div v-else-if="summary" class="space-y-4">
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div class="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
          <p class="text-xs text-gray-400 dark:text-gray-500">Current balance</p>
          <p class="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(summary.currentBalance) }}</p>
        </div>
        <div class="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
          <p class="text-xs text-gray-400 dark:text-gray-500">Pending real txns</p>
          <p class="text-lg font-bold tabular-nums" :class="summary.pendingRealTransactions < 0 ? 'text-red-500' : 'text-emerald-600'">
            {{ formatCurrency(summary.pendingRealTransactions) }}
          </p>
        </div>
        <div class="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
          <p class="text-xs text-gray-400 dark:text-gray-500">Calculated</p>
          <p class="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(summary.calculatedBalance) }}</p>
        </div>
        <div class="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
          <p class="text-xs text-amber-600 dark:text-amber-400">Scheduled bills</p>
          <p class="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">{{ formatCurrency(summary.scheduledUpcomingBills) }}</p>
        </div>
        <div class="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-3">
          <p class="text-xs text-indigo-600 dark:text-indigo-400">Active reserves</p>
          <p class="text-lg font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{{ formatCurrency(summary.activeReserves) }}</p>
        </div>
        <div class="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
          <p class="text-xs text-emerald-600 dark:text-emerald-400">True available</p>
          <p class="text-lg font-bold tabular-nums" :class="summary.availableToSpend >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-500'">
            {{ formatCurrency(summary.availableToSpend) }}
          </p>
        </div>
      </div>

      <div v-if="summary.accounts.length > 0" class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              <th class="py-2 pr-4">Cash account</th>
              <th class="py-2 pr-4 text-right">Calculated</th>
              <th class="py-2 pr-4 text-right">Reserves</th>
              <th class="py-2 text-right">Available</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="account in summary.accounts" :key="account.id">
              <td class="py-2 pr-4">
                <span class="inline-flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: account.color ?? '#6366f1' }" />
                  <span class="font-medium text-gray-800 dark:text-gray-100">{{ account.name }}</span>
                </span>
              </td>
              <td class="py-2 pr-4 text-right tabular-nums text-gray-600 dark:text-gray-300">{{ formatCurrency(account.calculatedBalance) }}</td>
              <td class="py-2 pr-4 text-right tabular-nums text-indigo-600 dark:text-indigo-400">{{ formatCurrency(account.activeReserves) }}</td>
              <td class="py-2 text-right tabular-nums font-semibold" :class="account.availableToSpend >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'">
                {{ formatCurrency(account.availableToSpend) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AvailabilityAccount {
  id: number
  name: string
  type: string
  color: string | null
  currentBalance: number
  pendingRealTransactions: number
  calculatedBalance: number
  activeReserves: number
  availableToSpend: number
}

interface AvailabilitySummary {
  currentBalance: number
  pendingRealTransactions: number
  calculatedBalance: number
  scheduledUpcomingBills: number
  activeReserves: number
  availableToSpend: number
  accounts: AvailabilityAccount[]
}

defineProps<{
  summary: AvailabilitySummary | null
  loading?: boolean
}>()

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return formatMoney(value)
}
</script>
