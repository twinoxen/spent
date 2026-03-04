<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <UCard class="cursor-pointer transition-shadow hover:shadow-md" @click="emit('select-spend')">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Spend</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{{ formatCurrency(totalSpend) }}</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          {{ dateRangeLabel }}
          <template v-if="avgMonthly > 0"> · {{ formatCurrency(avgMonthly) }}/mo</template>
        </p>
      </div>
    </UCard>

    <UCard class="cursor-pointer transition-shadow hover:shadow-md" @click="emit('select-income')">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total Income</p>
        <p class="text-2xl font-bold tabular-nums" :class="totalIncome > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-900 dark:text-white'">
          {{ formatCurrency(totalIncome) }}
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500">credits &amp; payments in</p>
      </div>
    </UCard>

    <UCard>
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Transactions</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{{ transactionCount }}</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">purchases</p>
      </div>
    </UCard>

    <UCard class="cursor-pointer transition-shadow hover:shadow-md" @click="emit('select-uncategorized')">
      <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Uncategorized</p>
        <p class="text-2xl font-bold tabular-nums" :class="uncategorizedCount > 0 ? 'text-amber-500' : 'text-emerald-500'">
          {{ uncategorizedCount }}
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500">{{ uncategorizedCount > 0 ? 'need review' : 'all tagged' }}</p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  totalSpend: number
  totalIncome: number
  transactionCount: number
  uncategorizedCount: number
  dateRangeLabel: string
  avgMonthly: number
}>()

const emit = defineEmits<{
  'select-spend': []
  'select-income': []
  'select-uncategorized': []
}>()
</script>
