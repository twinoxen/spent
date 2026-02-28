export default defineNuxtRouteMiddleware(async (to) => {
  // Skip auth check on login page
  if (to.path === '/login') return

  const { user, initialized, fetchUser } = useAuth()

  // On the first navigation (page load / SSR hydration), fetch the current session
  if (!initialized.value) {
    await fetchUser()
  }

  if (!user.value) {
    return navigateTo('/login', { replace: true })
  }
})
