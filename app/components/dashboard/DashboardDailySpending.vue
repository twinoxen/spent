<template>
  <UCard>
    <template #header>
      <div>
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Daily Spending</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Heat map — darker means more spent</p>
      </div>
    </template>
    <SpendingCalendar
      :purchased-by="purchasedBy"
      :account-ids="accountIds"
      :date-range="dateRange"
      :start-date="startDate"
      :end-date="endDate"
    />
  </UCard>
</template>

<script setup lang="ts">
import SpendingCalendar from '~/components/charts/SpendingCalendar.vue'

defineProps<{
  purchasedBy: string | null
  accountIds: number[]
  dateRange: string
  startDate?: string
  endDate?: string
}>()
</script>
