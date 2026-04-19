import { defineStore } from 'pinia';

interface BrandAssignment {
  brandId: string;
  brand: { id: string; name: string };
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt?: string | null;
  brandAssignments?: BrandAssignment[];
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
    isBrandManager: (state) => state.user?.role === 'BRAND_MANAGER',
    isSuperAdmin: (state) => state.user?.role === 'SUPER_ADMIN',
    isAdminOrAbove: (state) =>
      state.user?.role === 'ADMIN' || state.user?.role === 'SUPER_ADMIN',
    allowedBrandIds: (state) =>
      state.user?.brandAssignments?.map((a) => a.brandId) ?? [],
    allowedBrands: (state) =>
      state.user?.brandAssignments?.map((a) => a.brand) ?? [],
  },

  actions: {
    setUser(user: AdminUser) {
      // Deep-clone into plain objects to ensure SSR hydration compatibility.
      // $fetch responses may produce objects via devalue that lack
      // Object.prototype methods (e.g. hasOwnProperty), which Pinia's
      // shouldHydrate() requires.
      this.user = JSON.parse(JSON.stringify(user));
    },
    clear() {
      this.user = null;
    },
    markInitialized() {
      this.initialized = true;
    },
  },
});
