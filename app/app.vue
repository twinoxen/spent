<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <NuxtLink to="/" class="text-xl font-bold text-primary-600 dark:text-primary-400 flex items-center gap-2">
              💰 Finance Visualizer
            </NuxtLink>

            <div class="flex items-center gap-1">
              <template v-for="item in navItems" :key="item.to">
                <div class="relative">
                  <UButton
                    :to="item.to"
                    :label="item.label"
                    :icon="item.icon"
                    :variant="isActive(item.to) ? 'soft' : 'ghost'"
                    color="primary"
                    size="sm"
                  />
                  <span
                    v-if="item.to === '/review' && uncategorizedCount > 0"
                    class="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none"
                  >
                    {{ uncategorizedCount > 99 ? '99+' : uncategorizedCount }}
                  </span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>

<script setup lang="ts">
const route = useRoute()

const navItems = [
  { to: '/', label: 'Dashboard', icon: 'i-heroicons-chart-pie' },
  { to: '/transactions', label: 'Transactions', icon: 'i-heroicons-list-bullet' },
  { to: '/accounts', label: 'Accounts', icon: 'i-heroicons-credit-card' },
  { to: '/categories', label: 'Categories', icon: 'i-heroicons-tag' },
  { to: '/review', label: 'Review', icon: 'i-heroicons-check-circle' },
  { to: '/import', label: 'Import', icon: 'i-heroicons-arrow-up-tray' },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const uncategorizedCount = ref(0)

async function loadUncategorizedCount() {
  try {
    const data = await $fetch('/api/transactions', {
      params: { uncategorizedOnly: 'true', limit: 1 },
    }) as { total: number }
    uncategorizedCount.value = data.total
  } catch {
    // silently ignore — badge is non-critical
  }
}

// Refresh the badge whenever the route changes (e.g. after categorizing on /review)
watch(() => route.path, loadUncategorizedCount)
onMounted(loadUncategorizedCount)
</script>
