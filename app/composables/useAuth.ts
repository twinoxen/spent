interface AuthUser {
  id: number
  email: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const initialized = useState<boolean>('auth:initialized', () => false)

  async function fetchUser() {
    const apiFetch = useRequestFetch()
    try {
      const data = await apiFetch<AuthUser>('/api/auth/me')
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
