<script setup lang="ts">
interface CategoryNode {
  id: number
  name: string
  icon?: string | null
  color?: string | null
  children: CategoryNode[]
}

const props = defineProps<{
  modelValue: string | null | undefined
  tree: CategoryNode[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const open = ref(false)

function select(id: string | null) {
  emit('update:modelValue', id)
  open.value = false
}

function findNode(nodes: CategoryNode[], id: string | null | undefined): CategoryNode | null {
  if (!id) return null
  for (const node of nodes) {
    if (String(node.id) === id) return node
    if (node.children?.length) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

const selectedNode = computed(() => findNode(props.tree, props.modelValue))

const triggerLabel = computed(() => {
  if (!selectedNode.value) return props.placeholder ?? 'No Category'
  return [selectedNode.value.icon, selectedNode.value.name].filter(Boolean).join(' ')
})
</script>

<template>
  <UPopover v-model:open="open" :ui="{ content: 'w-(--reka-popper-anchor-width) p-0 overflow-hidden' }">
    <button
      type="button"
      class="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors hover:border-gray-300 dark:hover:border-gray-600"
      :class="selectedNode ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'"
    >
      <span class="truncate">{{ triggerLabel }}</span>
      <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-gray-400 shrink-0 transition-transform" :class="open ? 'rotate-180' : ''" />
    </button>

    <template #content>
      <div class="max-h-72 overflow-y-auto py-1">
        <!-- No Category -->
        <button
          type="button"
          class="w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          :class="!modelValue ? 'text-primary-600 dark:text-primary-400 font-medium bg-primary-50/50 dark:bg-primary-950/30' : 'text-gray-500 dark:text-gray-400'"
          @click="select(null)"
        >
          <UIcon name="i-lucide-circle-slash" class="w-4 h-4 shrink-0 opacity-60" />
          <span>No Category</span>
          <UIcon v-if="!modelValue" name="i-lucide-check" class="w-4 h-4 ml-auto shrink-0" />
        </button>

        <div class="mx-2 my-1 border-t border-gray-100 dark:border-gray-800" />

        <!-- Tree nodes (recursive via component) -->
        <CategorySelectNode
          v-for="node in tree"
          :key="node.id"
          :node="node"
          :selected-id="modelValue ?? null"
          :depth="0"
          @select="select"
        />
      </div>
    </template>
  </UPopover>
</template>
