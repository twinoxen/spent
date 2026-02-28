<template>
  <div>
    <!-- ── Single-month view header ── -->
    <div v-if="isSingleMonth" class="grid grid-cols-7 mb-1">
      <div
        v-for="d in DAY_NAMES"
        :key="d"
        class="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 py-1"
      >
        {{ d }}
      </div>
    </div>

    <!-- ── Loading ── -->
    <div v-if="pending" class="flex items-center justify-center h-40">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
    </div>

    <!-- ── Single-month grid ── -->
    <div v-else-if="isSingleMonth" class="grid grid-cols-7 gap-1">
      <div v-for="i in firstDayOffset" :key="`pad-${i}`" />

      <UTooltip
        v-for="day in singleMonthDays"
        :key="day.dateStr"
        :text="day.total > 0
          ? `${day.label}: ${formatCurrency(day.total)} · ${day.count} txn${day.count !== 1 ? 's' : ''}`
          : day.label"
        :popper="{ placement: 'top' }"
      >
        <div
          class="relative rounded-lg p-1.5 flex flex-col aspect-square transition-transform hover:scale-105"
          :class="day.total > 0 ? 'cursor-pointer' : 'cursor-default'"
          :style="{ backgroundColor: cellBg(day.total), color: cellText(day.total) }"
          @click="day.total > 0 && navigateTo(`/transactions?date=${day.dateStr}`)"
        >
          <span class="text-[11px] font-semibold leading-none">{{ day.day }}</span>
          <span
            v-if="day.total > 0"
            class="text-[9px] font-medium leading-tight mt-auto opacity-90 tabular-nums"
          >
            {{ formatCurrencyCompact(day.total) }}
          </span>
        </div>
      </UTooltip>
    </div>

    <!-- ── Multi-month dot view ── -->
    <div v-else class="space-y-5">
      <div
        v-if="!yearGroups.length"
        class="py-8 text-center text-sm text-gray-400 dark:text-gray-500"
      >
        No transactions in this period
      </div>

      <div v-for="yg in yearGroups" :key="yg.year">
        <!-- Year divider (only when data spans multiple years) -->
        <div v-if="hasMultipleYears" class="flex items-center gap-2 mb-3">
          <span class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{{ yg.year }}</span>
          <div class="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
        </div>

        <!-- Month rows -->
        <div class="space-y-3" :class="{ 'pl-3': hasMultipleYears }">
          <div v-for="mg in yg.months" :key="mg.yearMonth">
            <p class="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {{ mg.label }}
            </p>
            <div class="flex flex-wrap gap-1">
              <UTooltip
                v-for="day in mg.days"
                :key="day.dateStr"
                :text="day.total > 0
                  ? `${day.label}: ${formatCurrency(day.total)} · ${day.count} txn${day.count !== 1 ? 's' : ''}`
                  : day.label"
                :popper="{ placement: 'top' }"
              >
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 select-none"
                  :class="day.total > 0 ? 'cursor-pointer' : 'cursor-default'"
                  :style="{ backgroundColor: cellBg(day.total), color: cellText(day.total) }"
                  @click="day.total > 0 && navigateTo(`/transactions?date=${day.dateStr}`)"
                >
                  <span class="text-[8px] font-bold leading-none tabular-nums">{{ day.day }}</span>
                </div>
              </UTooltip>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Legend ── -->
    <div class="flex items-center justify-end gap-1.5 mt-4">
      <span class="text-[10px] text-gray-400 dark:text-gray-600">Less</span>
      <div
        v-for="(level, i) in LEGEND_LEVELS"
        :key="i"
        class="w-3.5 h-3.5"
        :class="isSingleMonth ? 'rounded-sm' : 'rounded-full'"
        :style="{ backgroundColor: legendColor(level) }"
      />
      <span class="text-[10px] text-gray-400 dark:text-gray-600">More</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LEGEND_LEVELS = [0, 0.15, 0.35, 0.6, 0.8, 1]

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const props = defineProps<{
  purchasedBy?: string | null
  accountIds?: number[]
  dateRange?: string   // '30' | '90' | '180' | '365' | 'all'
  startDate?: string   // YYYY-MM-DD (undefined when all-time)
  endDate?: string     // YYYY-MM-DD
}>()

// ── View mode ──────────────────────────────────────────────────────────────
const isSingleMonth = computed(() => !props.dateRange || props.dateRange === '30')

// ── Derive year/month for the single-month grid from the startDate prop ─────
const singleMonthYear = computed(() =>
  props.startDate ? parseInt(props.startDate.split('-')[0]) : new Date().getFullYear(),
)
const singleMonthMonth = computed(() =>
  props.startDate ? parseInt(props.startDate.split('-')[1]) : new Date().getMonth() + 1,
)

// ── Data fetching ───────────────────────────────────────────────────────────
const pending = ref(false)
const rawDays = ref<Array<{ date: string; total: number; count: number }>>([])

async function fetchData() {
  pending.value = true
  try {
    const query: Record<string, unknown> = {}
    if (props.purchasedBy) query.purchasedBy = props.purchasedBy
    if (props.accountIds && props.accountIds.length > 0) query.accountIds = props.accountIds.join(',')
    if (props.startDate) query.startDate = props.startDate
    if (props.endDate) query.endDate = props.endDate

    const result = await $fetch('/api/transactions/daily', { query })
    rawDays.value = result.days
  } catch (e) {
    console.error('Failed to load daily spend:', e)
  } finally {
    pending.value = false
  }
}

watch(
  [
    () => props.startDate,
    () => props.endDate,
    () => props.purchasedBy,
    () => props.accountIds,
  ],
  fetchData,
  { immediate: true },
)

// ── Day map ─────────────────────────────────────────────────────────────────
const dayMap = computed(() => {
  const m: Record<string, { total: number; count: number }> = {}
  for (const d of rawDays.value) m[d.date] = { total: d.total, count: d.count }
  return m
})

// ── Single-month grid ───────────────────────────────────────────────────────
const firstDayOffset = computed(() => new Date(singleMonthYear.value, singleMonthMonth.value - 1, 1).getDay())
const daysInMonth = computed(() => new Date(singleMonthYear.value, singleMonthMonth.value, 0).getDate())

const singleMonthDays = computed(() =>
  Array.from({ length: daysInMonth.value }, (_, i) => {
    const day = i + 1
    const y = singleMonthYear.value
    const m = singleMonthMonth.value
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const entry = dayMap.value[dateStr]
    return {
      day,
      dateStr,
      total: entry?.total ?? 0,
      count: entry?.count ?? 0,
      label: new Date(y, m - 1, day).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }),
    }
  }),
)

// ── Multi-month dot view ─────────────────────────────────────────────────────
interface DayEntry { day: number; dateStr: string; total: number; count: number; label: string }
interface MonthGroup { yearMonth: string; year: number; month: number; label: string; days: DayEntry[] }
interface YearGroup { year: number; months: MonthGroup[] }

const yearGroups = computed((): YearGroup[] => {
  if (!rawDays.value.length) return []

  // Collect all unique year-months that appear in the data
  const monthsSet = new Set<string>()
  for (const d of rawDays.value) monthsSet.add(d.date.substring(0, 7))

  const byYear: Record<number, Record<string, MonthGroup>> = {}

  for (const ym of [...monthsSet].sort()) {
    const [y, m] = ym.split('-').map(Number)
    const count = new Date(y, m, 0).getDate()

    const days: DayEntry[] = Array.from({ length: count }, (_, i) => {
      const day = i + 1
      const dateStr = `${ym}-${String(day).padStart(2, '0')}`
      const entry = dayMap.value[dateStr] ?? { total: 0, count: 0 }
      return {
        day,
        dateStr,
        total: entry.total,
        count: entry.count,
        label: new Date(y, m - 1, day).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
      }
    })

    if (!byYear[y]) byYear[y] = {}
    byYear[y][ym] = {
      yearMonth: ym,
      year: y,
      month: m,
      label: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
      days,
    }
  }

  return Object.keys(byYear)
    .map(Number)
    .sort()
    .map(y => ({
      year: y,
      months: Object.values(byYear[y]).sort((a, b) => a.month - b.month),
    }))
})

const hasMultipleYears = computed(() => yearGroups.value.length > 1)

// ── Heat map scale (unified across whichever view is active) ─────────────────
const maxTotal = computed(() => {
  const days = isSingleMonth.value
    ? singleMonthDays.value
    : yearGroups.value.flatMap(yg => yg.months.flatMap(mg => mg.days))
  return Math.max(...days.map(d => d.total), 1)
})

function intensity(total: number): number {
  if (total <= 0) return 0
  return Math.min(Math.sqrt(total / maxTotal.value), 1)
}

// Light mode: indigo-50 (#eef2ff) → indigo-700 (#4338ca)
// Dark mode:  gray-800 (#1f2937) → indigo-400 (#818cf8)
function cellBg(total: number): string {
  const t = intensity(total)
  if (t === 0) return isDark.value ? '#1f2937' : '#f9fafb'
  if (isDark.value) {
    const r = Math.round(31 + (129 - 31) * t)
    const g = Math.round(41 + (140 - 41) * t)
    const b = Math.round(55 + (248 - 55) * t)
    return `rgb(${r},${g},${b})`
  } else {
    const r = Math.round(238 + (67 - 238) * t)
    const g = Math.round(242 + (56 - 242) * t)
    const b = Math.round(255 + (202 - 255) * t)
    return `rgb(${r},${g},${b})`
  }
}

function cellText(total: number): string {
  const t = intensity(total)
  if (t === 0) return isDark.value ? '#4b5563' : '#d1d5db'
  if (t > 0.55) return '#ffffff'
  return isDark.value ? '#e5e7eb' : '#3730a3'
}

function legendColor(level: number): string {
  return cellBg(level * maxTotal.value)
}
</script>
