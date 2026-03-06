<template>
  <UCard class="mb-6">
    <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
      <!-- Date Range Segments -->
      <div class="flex items-center gap-2.5">
        <span class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Range</span>
        <div class="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
          <button
            v-for="range in dateRanges"
            :key="range.value"
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-all"
            :class="dateRange === range.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
            @click="emit('set-date-range', range.value)"
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
            @click="emit('shift-range', -1)"
          >
            <UIcon name="i-heroicons-chevron-left" class="w-3.5 h-3.5" />
          </button>
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 px-1 min-w-[9rem] text-center tabular-nums">
            {{ periodLabel }}
          </span>
          <button
            class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            :disabled="isLatestPeriod"
            @click="emit('shift-range', 1)"
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
            @click="emit('toggle-person', person)"
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

      <!-- Account Toggles (full-width row on mobile so pills can scroll) -->
      <div v-if="availableAccounts.length > 0" class="flex items-center gap-2.5 min-w-0 w-full sm:w-auto basis-full sm:basis-auto">
        <div class="h-5 w-px bg-gray-200 dark:bg-gray-700 flex-shrink-0 hidden sm:block" />
        <span class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex-shrink-0">Account</span>
        <div class="flex gap-1.5 overflow-x-auto scrollbar-hide min-w-0 flex-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <button
            v-for="account in availableAccounts"
            :key="account.id"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex-shrink-0 whitespace-nowrap"
            :class="selectedAccountIds.includes(account.id)
              ? 'border-transparent text-white'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-transparent'"
            :style="selectedAccountIds.includes(account.id) ? { backgroundColor: account.color } : {}"
            @click="emit('toggle-account', account.id)"
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
      <div v-if="loading && hasStats" class="ml-auto flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <div class="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-500" />
        Updating…
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const PERSON_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']

const props = defineProps<{
  dateRanges: Array<{ label: string; value: string }>
  dateRange: string
  isLatestPeriod: boolean
  periodLabel: string
  availablePurchasers: string[]
  selectedPerson: string | null
  availableAccounts: Array<{ id: number; name: string; color: string }>
  selectedAccountIds: number[]
  loading: boolean
  hasStats: boolean
}>()

const emit = defineEmits<{
  'set-date-range': [value: string]
  'shift-range': [direction: -1 | 1]
  'toggle-person': [person: string]
  'toggle-account': [accountId: number]
}>()

function personColor(name: string): string {
  const idx = props.availablePurchasers.indexOf(name)
  return PERSON_COLORS[idx % PERSON_COLORS.length] ?? '#6b7280'
}
</script>
