import { defineStore } from 'pinia';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt?: string | null;
}

export const useAdminAuthStore = defineStore('admin-auth', {
  state: () => ({
    user: null as AdminUser | null,
    initialized: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    email: (state) => state.user?.email ?? null,
    role: (state) => state.user?.role ?? null,
  },

  actions: {
    setUser(user: AdminUser) {
      // Spread into a plain object to ensure SSR hydration compatibility
      // ($fetch responses may lack Object.prototype methods that devalue expects)
      this.user = { ...user };
    },
    clear() {
      this.user = null;
    },
    markInitialized() {
      this.initialized = true;
    },
  },
});
