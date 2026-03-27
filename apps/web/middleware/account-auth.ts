export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const { isLoggedIn, fetchMe } = useStorefrontAuth();

  // Ensure we've checked auth state
  if (!isLoggedIn.value) {
    await fetchMe();
  }

  if (!isLoggedIn.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
