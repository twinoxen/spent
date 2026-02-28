interface AuthUser {
  id: number
  email: string
}

const user = ref<AuthUser | null>(null)
const initialized = ref(false)

export function useAuth() {
  async function fetchUser() {
    try {
      const data = await $fetch<AuthUser>('/api/auth/me')
      user.value = data
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  function setUser(data: AuthUser) {
    user.value = data
    initialized.value = true
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  return { user: readonly(user), initialized: readonly(initialized), fetchUser, setUser, logout }
}
