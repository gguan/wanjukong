import { defineStore } from 'pinia';

export const useAdminAuthStore = defineStore('admin-auth', {
  state: () => ({
    isLoggedIn: false,
    email: null as string | null,
  }),

  actions: {
    login(email: string) {
      this.isLoggedIn = true;
      this.email = email;
    },

    logout() {
      this.isLoggedIn = false;
      this.email = null;
    },
  },
});
