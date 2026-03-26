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
      this.user = user;
    },
    clear() {
      this.user = null;
    },
    markInitialized() {
      this.initialized = true;
    },
  },
});
