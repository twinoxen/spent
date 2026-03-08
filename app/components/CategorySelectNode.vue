<script setup lang="ts">
interface CategoryNode {
  id: number
  name: string
  icon?: string | null
  color?: string | null
  children: CategoryNode[]
}

const props = defineProps<{
  node: CategoryNode
  selectedId: string | null
  depth: number
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const isSelected = computed(() => props.selectedId === String(props.node.id))
const hasChildren = computed(() => props.node.children?.length > 0)
const paddingLeft = computed(() => `${0.75 + props.depth * 1.25}rem`)
</script>

<template>
  <button
    type="button"
    class="w-full text-sm text-left flex items-center gap-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 py-2 pr-3"
    :class="[
      isSelected
        ? 'text-primary-600 dark:text-primary-400 font-medium bg-primary-50/50 dark:bg-primary-950/30'
        : depth === 0
          ? 'text-gray-800 dark:text-gray-200 font-medium'
          : 'text-gray-600 dark:text-gray-400',
    ]"
    :style="{ paddingLeft }"
    @click="emit('select', String(node.id))"
  >
    <span v-if="node.icon" class="shrink-0">{{ node.icon }}</span>
    <span class="truncate">{{ node.name }}</span>
    <UIcon v-if="isSelected" name="i-lucide-check" class="w-4 h-4 ml-auto shrink-0" />
  </button>

  <!-- Recursive children -->
  <CategorySelectNode
    v-if="hasChildren"
    v-for="child in node.children"
    :key="child.id"
    :node="child"
    :selected-id="selectedId"
    :depth="depth + 1"
    @select="emit('select', $event)"
  />
</template>
