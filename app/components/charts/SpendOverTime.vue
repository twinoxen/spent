<template>
  <Bar :data="chartData" :options="(options as any)" />
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const colorMode = useColorMode()

const props = defineProps<{
  data: Array<{ month: string; total: number }>
}>()

const isDark = computed(() => colorMode.value === 'dark')

const chartData = computed(() => ({
  labels: props.data.map(d => formatMonth(d.month)),
  datasets: [{
    label: 'Spending',
    data: props.data.map(d => d.total),
    backgroundColor: isDark.value ? 'rgba(99,102,241,0.75)' : 'rgba(99,102,241,0.85)',
    hoverBackgroundColor: '#6366f1',
    borderRadius: 5,
    borderSkipped: false,
  }],
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context: any) => ` ${formatCurrency(context.parsed.y)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: isDark.value ? '#6b7280' : '#9ca3af',
        font: { size: 11 },
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: isDark.value ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      border: { display: false },
      ticks: {
        color: isDark.value ? '#6b7280' : '#9ca3af',
        font: { size: 11 },
        callback: (value: any) => formatCurrencyCompact(value),
      },
    },
  },
}))

function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-')
  return new Date(parseInt(year), parseInt(monthNum) - 1)
    .toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}
</script>
