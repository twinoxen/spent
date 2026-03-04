<template>
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
        <div v-if="loading" class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
          <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-500" />
        </div>
      </div>
    </template>
    <div v-if="merchants.length > 0" class="space-y-0.5">
      <div
        v-for="(merchant, i) in merchants.slice(0, 8)"
        :key="merchant.merchantId ?? i"
        class="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
        @click="emit('select', merchant)"
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
</template>

<script setup lang="ts">
defineProps<{
  merchants: any[]
  loading: boolean
  drilledCategory: { categoryId: number | null; categoryName: string | null; categoryColor: string | null } | null
}>()

const emit = defineEmits<{
  select: [merchant: any]
}>()
</script>
