import { useAdminAuthStore } from '~/stores/admin-auth';

export function useAdminAuth() {
  const store = useAdminAuthStore();
  const api = useAdminApi();

  async function login(email: string, password: string) {
    const user = await api.post<{
      id: string;
      email: string;
      name: string;
      role: string;
    }>('/api/admin/auth/login', { email, password });
    store.setUser(user);
    navigateTo('/');
  }

  async function logout() {
    try {
      await api.post('/api/admin/auth/logout', {});
    } catch {
      // Ignore errors on logout
    }
    store.clear();
    navigateTo('/login');
  }

  async function bootstrap() {
    if (store.initialized) return;
    try {
      const user = await api.get<{
        id: string;
        email: string;
        name: string;
        role: string;
        lastLoginAt?: string | null;
      } | null>('/api/admin/auth/me');
      if (user) {
        store.setUser(user);
      }
    } catch {
      store.clear();
    } finally {
      store.markInitialized();
    }
  }

  return {
    isLoggedIn: computed(() => store.isLoggedIn),
    user: computed(() => store.user),
    email: computed(() => store.email),
    role: computed(() => store.role),
    login,
    logout,
    bootstrap,
  };
}
