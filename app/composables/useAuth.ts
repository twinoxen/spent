interface AuthUser {
  id: number
  email: string
}

export function useAuth() {
  // Use Nuxt state so auth is request-scoped during SSR and survives hydration.
  const user = useState<AuthUser | null>('auth_user', () => null)
  const initialized = useState('auth_initialized', () => false)

  async function fetchUser() {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await $fetch<AuthUser>('/api/auth/me', { headers })
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
