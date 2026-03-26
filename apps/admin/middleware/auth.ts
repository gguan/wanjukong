import { useAdminAuthStore } from '~/stores/admin-auth';

export default defineNuxtRouteMiddleware(async (to) => {
  // Auth bootstrap must only run client-side because the session cookie
  // is only available in the browser — SSR requests have no cookie context.
  if (import.meta.server) return;

  const store = useAdminAuthStore();

  // Bootstrap session on first client-side navigation
  if (!store.initialized) {
    const { bootstrap } = useAdminAuth();
    await bootstrap();
  }

  if (!store.isLoggedIn && to.path !== '/login') {
    return navigateTo('/login');
  }

  // Redirect logged-in users away from login page
  if (store.isLoggedIn && to.path === '/login') {
    return navigateTo('/');
  }
});
