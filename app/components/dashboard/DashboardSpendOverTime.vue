<template>
  <UCard>
    <template #header>
      <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Spending Over Time</p>
    </template>
    <div class="h-56">
      <SpendOverTime v-if="data.length > 0" :data="data" @month-click="emit('month-click', $event)" />
      <div v-else class="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
        No data for this period
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import SpendOverTime from '~/components/charts/SpendOverTime.vue'

defineProps<{
  data: Array<{ month: string; total: number }>
}>()

const emit = defineEmits<{
  'month-click': [month: string]
}>()
</script>
