import { useAdminAuthStore } from '~/stores/admin-auth';

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAdminAuthStore();

  if (!auth.isLoggedIn && to.path !== '/login') {
    return navigateTo('/login');
  }
});
