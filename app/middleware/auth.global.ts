export default defineNuxtRouteMiddleware(async (to) => {
  const { user, initialized, fetchUser } = useAuth()

  // If we're on the login page, we still want to redirect authenticated users.
  // This matters for full page reloads (e.g. Playwright `page.goto('/login')`),
  // where module-level state is reset and we must re-hydrate auth from cookies.
  if (to.path === '/login') {
    if (!initialized.value) {
      await fetchUser()
    }
    if (user.value) {
      return navigateTo('/', { replace: true })
    }
    return
  }

  // Skip auth check on OAuth authorize page
  if (to.path === '/oauth/authorize') return

  // On the first navigation (page load / SSR hydration), fetch the current session
  if (!initialized.value) {
    await fetchUser()
  }

  if (!user.value) {
    return navigateTo('/login', { replace: true })
  }
})
