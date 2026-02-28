export interface CategorySuggestion {
  name: string
  icon: string
  color: string
  patterns: string[]
  rationale: string
}

export interface SuggestionItem extends CategorySuggestion {
  approved: boolean
}

export function useCategorySuggestions() {
  const isModalOpen = ref(false)
  const isFetching = ref(false)
  const isApplying = ref(false)
  const suggestions = ref<SuggestionItem[]>([])
  const error = ref<string | null>(null)

  const approvedSuggestions = computed(() => suggestions.value.filter(s => s.approved))
  const hasApproved = computed(() => approvedSuggestions.value.length > 0)

  async function fetchSuggestions() {
    isFetching.value = true
    error.value = null
    suggestions.value = []

    try {
      const data = await $fetch<{ suggestions: CategorySuggestion[] }>('/api/categories/suggest', {
        method: 'POST',
      })

      suggestions.value = data.suggestions.map(s => ({ ...s, approved: true }))
      isModalOpen.value = true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch suggestions.'
      error.value = message
    } finally {
      isFetching.value = false
    }
  }

  async function applyApproved(): Promise<{ created: number; categorized: number } | null> {
    if (!hasApproved.value) return null

    isApplying.value = true
    error.value = null

    try {
      const result = await $fetch<{ created: number; categorized: number }>('/api/categories/apply-suggestions', {
        method: 'POST',
        body: { approved: approvedSuggestions.value.map(({ approved: _, ...s }) => s) },
      })

      isModalOpen.value = false
      suggestions.value = []
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to apply suggestions.'
      error.value = message
      return null
    } finally {
      isApplying.value = false
    }
  }

  function toggleApproval(index: number) {
    const s = suggestions.value[index]
    if (s) s.approved = !s.approved
  }

  function closeModal() {
    isModalOpen.value = false
    suggestions.value = []
    error.value = null
  }

  return {
    isModalOpen,
    isFetching,
    isApplying,
    suggestions,
    approvedSuggestions,
    hasApproved,
    error,
    fetchSuggestions,
    applyApproved,
    toggleApproval,
    closeModal,
  }
}
