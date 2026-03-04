<template>
  <UCard>
    <template #header>
      <div>
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Spending by Category</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ dateRangeLabel }} · click a category to filter</p>
      </div>
    </template>
    <div class="h-96">
      <SpendByCategory v-if="data.length > 0" :data="data" @select="emit('select', $event)" @drilldown="emit('drilldown', $event)" />
      <div v-else class="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
        No data for this period
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import SpendByCategory from '~/components/charts/SpendByCategory.vue'

defineProps<{
  data: any[]
  dateRangeLabel: string
}>()

const emit = defineEmits<{
  select: [categoryId: number | null]
  drilldown: [item: { categoryId: number | null; categoryName: string | null; categoryColor: string | null } | null]
}>()
</script>
