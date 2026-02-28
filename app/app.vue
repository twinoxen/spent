<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">
            <NuxtLink to="/" class="flex items-center gap-2">
              <span class="text-xl font-bold text-primary-600 dark:text-primary-400">Spent</span>
              <span class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 leading-none">Beta</span>
            </NuxtLink>

            <!-- Desktop nav -->
            <div class="hidden sm:flex items-center gap-1">
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

              <div class="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <span class="text-sm text-gray-500 dark:text-gray-400 hidden md:inline">{{ user?.email }}</span>
                <UButton
                  icon="i-heroicons-arrow-right-on-rectangle"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  title="Sign out"
                  @click="logout"
                />
              </div>
            </div>

            <!-- Mobile: sign-out + hamburger -->
            <div class="flex sm:hidden items-center gap-1">
              <UButton
                icon="i-heroicons-arrow-right-on-rectangle"
                variant="ghost"
                color="neutral"
                size="sm"
                title="Sign out"
                @click="logout"
              />
              <UButton
                :icon="mobileMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'"
                variant="ghost"
                color="neutral"
                size="sm"
                aria-label="Toggle menu"
                @click="mobileMenuOpen = !mobileMenuOpen"
              />
            </div>
          </div>
        </div>

        <!-- Mobile menu -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="mobileMenuOpen"
            class="sm:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 flex flex-col gap-1"
          >
            <template v-for="item in navItems" :key="item.to">
              <div class="relative">
                <UButton
                  :to="item.to"
                  :label="item.label"
                  :icon="item.icon"
                  :variant="isActive(item.to) ? 'soft' : 'ghost'"
                  color="primary"
                  size="sm"
                  class="w-full justify-start"
                  @click="mobileMenuOpen = false"
                />
                <span
                  v-if="item.to === '/review' && uncategorizedCount > 0"
                  class="absolute top-1 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none"
                >
                  {{ uncategorizedCount > 99 ? '99+' : uncategorizedCount }}
                </span>
              </div>
            </template>
            <div class="mt-1 pt-2 border-t border-gray-100 dark:border-gray-800">
              <p class="text-xs text-gray-400 dark:text-gray-500 px-2 pb-1">{{ user?.email }}</p>
            </div>
          </div>
        </Transition>
      </nav>

      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <NuxtPage />
      </main>

      <footer class="border-t border-gray-200 dark:border-gray-800 mt-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center gap-2 text-center">
          <p class="text-sm text-gray-400 dark:text-gray-500">Spent &mdash; See where your money is going</p>
          <p class="text-xs text-amber-600 dark:text-amber-500 max-w-md">
            <span class="font-semibold">This app is in beta.</span>
            Features are actively changing and policies may shift without notice. Use it to explore, but don't rely on it for critical financial decisions yet.
          </p>
        </div>
      </footer>
    </div>
  </UApp>
</template>

<script setup lang="ts">
const route = useRoute()
const { user, logout } = useAuth()

const mobileMenuOpen = ref(false)

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

// Close mobile menu on route change
watch(() => route.path, () => { mobileMenuOpen.value = false })

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
