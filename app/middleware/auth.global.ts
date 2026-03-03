export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check on login page and OAuth authorize page
  if (to.path === '/login' || to.path === '/oauth/authorize') return

  const { user, initialized, fetchUser } = useAuth()

  // On the first navigation (page load / SSR hydration), fetch the current session
  if (!initialized.value) {
    await fetchUser()
  }

  if (!user.value) {
    return navigateTo('/login', { replace: true })
  }
})
