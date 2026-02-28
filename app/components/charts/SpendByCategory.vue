<template>
  <div class="flex flex-col h-full gap-3 min-h-0">

    <!-- Breadcrumb -->
    <div class="flex items-center gap-1.5 flex-shrink-0">
      <button
        class="text-xs transition-colors"
        :class="selectedParent
          ? 'text-primary-500 hover:text-primary-400'
          : 'text-gray-500 dark:text-gray-400 font-medium cursor-default pointer-events-none'"
        @click="selectedParent = null"
      >
        All Categories
      </button>
      <template v-if="selectedParent">
        <span class="text-gray-300 dark:text-gray-600 text-xs">/</span>
        <div class="flex items-center gap-1">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200">{{ selectedParent.categoryName }}</span>
        </div>
      </template>
    </div>

    <!-- Donut + List — side by side on sm+, stacked on mobile -->
    <div class="flex flex-col sm:flex-row gap-4 flex-1 min-h-0 min-w-0">

      <!-- Donut: fixed square on mobile, fluid half on sm+ -->
      <div class="flex-shrink-0 sm:flex-1 flex items-center justify-center sm:min-h-0">
        <div class="relative w-40 h-40 sm:h-full sm:w-auto sm:aspect-square sm:max-h-52">
          <Doughnut :key="donutKey" :data="chartData" :options="(chartOptions as any)" />
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
            <span class="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {{ selectedParent ? selectedParent.categoryName : 'Total' }}
            </span>
            <span class="text-sm font-bold text-gray-900 dark:text-white tabular-nums leading-tight">
              {{ formatCurrencyCompact(currentTotal) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Category list: scrollable, takes other half on sm+ -->
      <div class="sm:flex-1 min-w-0 overflow-y-auto max-h-48 sm:max-h-none sm:min-h-0 py-0.5">
        <div
          v-for="(item, i) in currentDisplayData"
          :key="i"
          class="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800/80 last:border-0 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 transition-colors group"
          @click="handleItemClick(item)"
        >
          <!-- Color dot -->
          <div
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: item.categoryColor || '#9ca3af' }"
          />

          <!-- Name -->
          <span class="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
            {{ item.categoryName || 'Uncategorized' }}
          </span>

          <!-- Drill-in chevron OR external-link icon -->
          <span
            v-if="item.hasChildren && !selectedParent"
            class="text-gray-300 dark:text-gray-600 group-hover:text-primary-400 transition-colors text-xs flex-shrink-0"
          >›</span>
          <UIcon
            v-else
            name="i-heroicons-arrow-top-right-on-square"
            class="w-3.5 h-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-primary-400 transition-colors"
          />

          <!-- Mini bar + % + amount -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="w-14 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{ width: itemPct(item.total) + '%', backgroundColor: item.categoryColor || '#9ca3af' }"
              />
            </div>
            <span class="text-xs text-gray-400 dark:text-gray-500 tabular-nums w-7 text-right">
              {{ itemPct(item.total) }}%
            </span>
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-100 tabular-nums w-20 text-right">
              {{ formatCurrency(item.total) }}
            </span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js'

ChartJS.register(ArcElement, Tooltip)

const colorMode = useColorMode()

interface CategoryStat {
  categoryId: number | null
  categoryName: string | null
  categoryColor: string | null
  categoryIcon: string | null
  categoryParentId: number | null
  parentName: string | null
  parentColor: string | null
  parentIcon: string | null
  total: number
  count: number
}

interface DisplayItem {
  categoryId: number | null
  categoryName: string | null
  categoryColor: string | null
  categoryIcon: string | null
  total: number
  count: number
  hasChildren: boolean
  children: CategoryStat[]
}

const props = defineProps<{ data: CategoryStat[] }>()

const emit = defineEmits<{
  select: [categoryId: number | null]
  drilldown: [item: { categoryId: number | null; categoryName: string | null; categoryColor: string | null } | null]
}>()

const selectedParent = ref<DisplayItem | null>(null)

watch(selectedParent, (val) => {
  emit('drilldown', val
    ? { categoryId: val.categoryId, categoryName: val.categoryName, categoryColor: val.categoryColor }
    : null
  )
})

// Force donut re-render when drilling (options change)
const donutKey = computed(() => selectedParent.value?.categoryId ?? 'root')

const isDark = computed(() => colorMode.value === 'dark')

// Roll up children under their parent for the top-level view
const level0Data = computed((): DisplayItem[] => {
  const groups = new Map<number | string, DisplayItem>()
  const parentIdsInData = new Set(
    props.data.filter(d => d.categoryParentId !== null).map(d => d.categoryParentId!)
  )

  for (const item of props.data) {
    if (item.categoryParentId === null) {
      // Root category — either a parent group or a standalone leaf
      const key = item.categoryId ?? 'uncategorized'
      if (parentIdsInData.has(item.categoryId as number)) {
        // Has children in data — create/update parent group
        const existing = groups.get(key)
        if (existing) {
          existing.total += item.total
          existing.count += item.count
        } else {
          groups.set(key, {
            categoryId: item.categoryId,
            categoryName: item.categoryName,
            categoryColor: item.categoryColor,
            categoryIcon: item.categoryIcon,
            total: item.total,
            count: item.count,
            hasChildren: true,
            children: [],
          })
        }
      } else {
        // Standalone leaf (no children in data)
        groups.set(key, {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categoryColor: item.categoryColor,
          categoryIcon: item.categoryIcon,
          total: item.total,
          count: item.count,
          hasChildren: false,
          children: [],
        })
      }
    } else {
      // Child — aggregate under parent
      const parentId = item.categoryParentId
      if (!groups.has(parentId)) {
        groups.set(parentId, {
          categoryId: parentId,
          categoryName: item.parentName,
          categoryColor: item.parentColor,
          categoryIcon: item.parentIcon,
          total: 0,
          count: 0,
          hasChildren: true,
          children: [],
        })
      }
      const parent = groups.get(parentId)!
      parent.total += item.total
      parent.count += item.count
      parent.children.push(item)
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.total - a.total)
})

// What's currently visible
const currentDisplayData = computed((): DisplayItem[] => {
  if (!selectedParent.value) return level0Data.value
  // Drill-in: show children of selected parent as leaf DisplayItems
  return selectedParent.value.children
    .map(c => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryColor: c.categoryColor,
      categoryIcon: c.categoryIcon,
      total: c.total,
      count: c.count,
      hasChildren: false,
      children: [],
    }))
    .sort((a, b) => b.total - a.total)
})

const currentTotal = computed(() =>
  currentDisplayData.value.reduce((sum, d) => sum + d.total, 0)
)

function itemPct(amount: number): number {
  if (currentTotal.value === 0) return 0
  return Math.round((amount / currentTotal.value) * 100)
}


function handleItemClick(item: DisplayItem) {
  if (!selectedParent.value && item.hasChildren) {
    // Drill in
    selectedParent.value = item
  } else {
    // Navigate to filtered transactions
    emit('select', item.categoryId)
  }
}

const chartData = computed(() => ({
  labels: currentDisplayData.value.map(d => d.categoryName || 'Uncategorized'),
  datasets: [{
    data: currentDisplayData.value.map(d => d.total),
    backgroundColor: currentDisplayData.value.map(d => d.categoryColor || '#9ca3af'),
    borderWidth: 2,
    borderColor: isDark.value ? '#111827' : '#f9fafb',
    hoverOffset: 6,
  }],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.parsed || 0
          const p = currentTotal.value > 0 ? ((val / currentTotal.value) * 100).toFixed(1) : 0
          return `  ${formatCurrency(val)}  (${p}%)`
        },
      },
    },
  },
}))
</script>
