<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Categories</h1>
      <UButton label="Add Category" color="primary" icon="i-heroicons-plus" @click="openAddCategoryModal" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Category Tree -->
      <UCard>
        <template #header>
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Category Hierarchy</p>
        </template>

        <div v-if="loading" class="flex justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>

        <div v-else class="space-y-3">
          <div v-for="category in categoryTree" :key="category.id" class="space-y-1">
            <!-- Parent -->
            <div
              class="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
              :class="selectedCategory?.id === category.id
                ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'"
              @click="selectCategory(category)"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl leading-none">{{ category.icon }}</span>
                <div>
                  <p class="font-medium text-sm text-gray-800 dark:text-gray-100">{{ category.name }}</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">{{ category.children.length }} subcategor{{ category.children.length === 1 ? 'y' : 'ies' }}</p>
                </div>
              </div>
              <div class="w-4 h-4 rounded-full flex-shrink-0" :style="{ backgroundColor: category.color }" />
            </div>

            <!-- Children -->
            <div v-if="category.children.length > 0" class="ml-6 space-y-1">
              <div
                v-for="child in category.children"
                :key="child.id"
                class="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer border transition-colors"
                :class="selectedCategory?.id === child.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                  : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60'"
                @click="selectCategory(child)"
              >
                <div class="flex items-center gap-2.5">
                  <span class="text-base leading-none">{{ child.icon }}</span>
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-200">{{ child.name }}</p>
                </div>
                <div class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: child.color }" />
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Detail Panel -->
      <div class="space-y-5">
        <!-- Category Details -->
        <UCard v-if="selectedCategory">
          <template #header>
            <div class="flex justify-between items-center">
              <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ selectedCategory.name }}</p>
              <div class="flex gap-2">
                <UButton label="Edit" size="sm" color="neutral" variant="outline" @click="openEditCategoryModal" />
                <UButton label="Delete" color="error" size="sm" variant="ghost" @click="deleteCategory" />
              </div>
            </div>
          </template>

          <div class="flex items-center gap-4">
            <span class="text-4xl">{{ selectedCategory.icon }}</span>
            <div
              class="w-10 h-10 rounded-full ring-2 ring-white dark:ring-gray-800"
              :style="{ backgroundColor: selectedCategory.color }"
            />
            <div>
              <p class="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">Parent</p>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-100">
                {{ selectedCategory.parentId ? getParentName(selectedCategory.parentId) : 'Root category' }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Merchant Rules -->
        <UCard v-if="selectedCategory">
          <template #header>
            <div class="flex justify-between items-center">
              <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Merchant Rules</p>
              <UButton label="Add Rule" size="sm" icon="i-heroicons-plus" color="primary" variant="soft" @click="openAddRuleModal" />
            </div>
          </template>

          <div v-if="loadingRules" class="flex justify-center py-6">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
          </div>

          <div v-else-if="merchantRules.length > 0" class="space-y-2">
            <div
              v-for="rule in merchantRules"
              :key="rule.id"
              class="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60"
            >
              <div>
                <p class="font-mono text-sm text-gray-800 dark:text-gray-200">{{ rule.pattern }}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">Priority: {{ rule.priority }}</p>
              </div>
              <UButton color="error" variant="ghost" size="sm" icon="i-heroicons-trash" @click="deleteRule(rule.id)" />
            </div>
          </div>

          <div v-else class="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
            No merchant rules defined
          </div>
        </UCard>

        <UCard v-if="!selectedCategory">
          <div class="text-center py-12 text-gray-400 dark:text-gray-500">
            <p class="text-sm">Select a category to view details and merchant rules</p>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Add/Edit Category Modal -->
    <UModal v-model:open="showCategoryModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">
              {{ editingCategory ? 'Edit Category' : 'Add Category' }}
            </p>
          </template>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <input
                v-model="categoryForm.name"
                type="text"
                placeholder="Category name"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Parent Category</label>
              <select
                v-model="categoryForm.parentId"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option :value="null">None (Root Category)</option>
                <option v-for="cat in rootCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Icon (Emoji)</label>
              <input
                v-model="categoryForm.icon"
                type="text"
                placeholder="🛒"
                maxlength="4"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
              <input
                v-model="categoryForm.color"
                type="color"
                class="w-full h-10 rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showCategoryModal = false" />
              <UButton :label="editingCategory ? 'Update' : 'Create'" color="primary" @click="saveCategory" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Add Merchant Rule Modal -->
    <UModal v-model:open="showRuleModal">
      <template #content>
        <UCard>
          <template #header>
            <p class="text-base font-semibold text-gray-800 dark:text-gray-100">Add Merchant Rule</p>
          </template>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pattern</label>
              <input
                v-model="ruleForm.pattern"
                type="text"
                placeholder="e.g., starbucks, shell oil, tst\*"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Use lowercase. Supports regex patterns.</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
              <input
                v-model.number="ruleForm.priority"
                type="number"
                placeholder="100"
                class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Higher priority rules are matched first.</p>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="ghost" @click="showRuleModal = false" />
              <UButton label="Create" color="primary" @click="saveRule" />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const loading = ref(true)
const loadingRules = ref(false)
const categoryTree = ref<any[]>([])
const allCategories = ref<any[]>([])
const rootCategories = computed(() => categoryTree.value)
const selectedCategory = ref<any>(null)
const merchantRules = ref<any[]>([])

const showCategoryModal = ref(false)
const showRuleModal = ref(false)
const editingCategory = ref(false)

const categoryForm = ref({ name: '', parentId: null as number | null, icon: '', color: '#3b82f6' })
const ruleForm = ref({ pattern: '', priority: 100 })

async function loadCategories() {
  loading.value = true
  try {
    const data = await $fetch('/api/categories')
    allCategories.value = data.categories
    categoryTree.value = data.tree
  } catch (error) {
    console.error('Failed to load categories:', error)
  } finally {
    loading.value = false
  }
}

async function loadMerchantRules() {
  if (!selectedCategory.value) return
  loadingRules.value = true
  try {
    const data = await $fetch('/api/merchant-rules', { params: { categoryId: selectedCategory.value.id } })
    merchantRules.value = data
  } catch (error) {
    console.error('Failed to load merchant rules:', error)
  } finally {
    loadingRules.value = false
  }
}

function selectCategory(category: any) {
  selectedCategory.value = category
  loadMerchantRules()
}

function getParentName(parentId: number): string {
  return allCategories.value.find(c => c.id === parentId)?.name || 'Unknown'
}

function openAddCategoryModal() {
  editingCategory.value = false
  categoryForm.value = { name: '', parentId: null, icon: '', color: '#3b82f6' }
  showCategoryModal.value = true
}

function openEditCategoryModal() {
  if (!selectedCategory.value) return
  editingCategory.value = true
  categoryForm.value = {
    name: selectedCategory.value.name,
    parentId: selectedCategory.value.parentId,
    icon: selectedCategory.value.icon || '',
    color: selectedCategory.value.color || '#3b82f6',
  }
  showCategoryModal.value = true
}

async function saveCategory() {
  try {
    if (editingCategory.value && selectedCategory.value) {
      await $fetch(`/api/categories/${selectedCategory.value.id}`, { method: 'PATCH', body: categoryForm.value })
    } else {
      await $fetch('/api/categories', { method: 'POST', body: categoryForm.value })
    }
    showCategoryModal.value = false
    await loadCategories()
    if (editingCategory.value && selectedCategory.value) {
      selectedCategory.value = allCategories.value.find(c => c.id === selectedCategory.value.id) ?? null
    }
  } catch (error) {
    console.error('Failed to save category:', error)
  }
}

async function deleteCategory() {
  if (!selectedCategory.value) return
  if (!confirm(`Delete "${selectedCategory.value.name}"? This will also delete all subcategories.`)) return
  try {
    await $fetch(`/api/categories/${selectedCategory.value.id}`, { method: 'DELETE' })
    selectedCategory.value = null
    await loadCategories()
  } catch (error) {
    console.error('Failed to delete category:', error)
  }
}

function openAddRuleModal() {
  ruleForm.value = { pattern: '', priority: 100 }
  showRuleModal.value = true
}

async function saveRule() {
  if (!selectedCategory.value || !ruleForm.value.pattern) return
  try {
    await $fetch('/api/merchant-rules', {
      method: 'POST',
      body: { ...ruleForm.value, categoryId: selectedCategory.value.id },
    })
    showRuleModal.value = false
    await loadMerchantRules()
  } catch (error) {
    console.error('Failed to save rule:', error)
  }
}

async function deleteRule(ruleId: number) {
  if (!confirm('Delete this rule?')) return
  try {
    await $fetch(`/api/merchant-rules/${ruleId}`, { method: 'DELETE' })
    await loadMerchantRules()
  } catch (error) {
    console.error('Failed to delete rule:', error)
  }
}

onMounted(loadCategories)
</script>
