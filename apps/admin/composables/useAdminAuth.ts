import { useAdminAuthStore } from '~/stores/admin-auth';

export function useAdminAuth() {
  const store = useAdminAuthStore();

  function login(email: string) {
    store.login(email);
    navigateTo('/');
  }

  function logout() {
    store.logout();
    navigateTo('/login');
  }

  return {
    isLoggedIn: computed(() => store.isLoggedIn),
    email: computed(() => store.email),
    login,
    logout,
  };
}
