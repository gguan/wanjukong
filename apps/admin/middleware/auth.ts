import { useAdminAuthStore } from '~/stores/admin-auth';

export default defineNuxtRouteMiddleware(async (to) => {
  const store = useAdminAuthStore();

  // Bootstrap session on first navigation
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
