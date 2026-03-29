<script setup lang="ts">
const APP_NAME = 'wanjukong';
const router = useRouter();
const { count } = useCart();
const { isLoggedIn, customer } = useStorefrontAuth();

const searchOpen = ref(false);
const searchInput = ref('');
const mobileMenuOpen = ref(false);

function toggleSearch() {
  searchOpen.value = !searchOpen.value;
  if (searchOpen.value) {
    nextTick(() => {
      document.querySelector<HTMLInputElement>('.header-search-input')?.focus();
    });
  }
}

function submitSearch() {
  const q = searchInput.value.trim();
  if (q) {
    router.push({ path: '/products', query: { search: q } });
    searchOpen.value = false;
    searchInput.value = '';
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <NuxtLink to="/" class="logo">{{ APP_NAME }}</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/" class="nav-link">Home</NuxtLink>
        <NuxtLink to="/brands" class="nav-link">Brands</NuxtLink>
        <NuxtLink to="/products" class="nav-link">Products</NuxtLink>
        <button class="search-toggle" aria-label="Search" @click="toggleSearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="20" height="20">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <NuxtLink to="/cart" class="cart-link" aria-label="Cart">
          <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          <ClientOnly>
            <span v-if="count > 0" class="cart-badge">{{ count }}</span>
          </ClientOnly>
        </NuxtLink>
        <ClientOnly>
          <NuxtLink v-if="isLoggedIn" to="/account" class="account-link" aria-label="Account">
            <svg class="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </NuxtLink>
          <NuxtLink v-else to="/login" class="login-link">Sign In</NuxtLink>
        </ClientOnly>
      </nav>
      <button class="hamburger" aria-label="Menu" @click="mobileMenuOpen = !mobileMenuOpen">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
  <!-- Mobile menu -->
  <div v-if="mobileMenuOpen" class="mobile-menu">
    <NuxtLink to="/" @click="mobileMenuOpen = false">Home</NuxtLink>
    <NuxtLink to="/brands" @click="mobileMenuOpen = false">Brands</NuxtLink>
    <NuxtLink to="/products" @click="mobileMenuOpen = false">Products</NuxtLink>
  </div>
  <!-- Search bar -->
  <div v-if="searchOpen" class="header-search-bar">
    <div class="header-search-inner">
      <form @submit.prevent="submitSearch">
        <input
          v-model="searchInput"
          class="header-search-input"
          type="text"
          placeholder="Search products..."
        />
      </form>
      <button class="header-search-close" @click="searchOpen = false">&times;</button>
    </div>
  </div>
</template>

<style scoped>
.app-header {
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111;
  text-decoration: none;
  letter-spacing: -0.02em;
}

.nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav a {
  color: #555;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.15s;
}

.nav a:hover,
.nav a.router-link-active {
  color: #111;
}

.cart-link {
  position: relative;
  display: flex;
  align-items: center;
}

.cart-icon {
  width: 22px;
  height: 22px;
}

.cart-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #111;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  line-height: 1;
}

.account-link {
  display: flex;
  align-items: center;
}

.account-icon {
  width: 22px;
  height: 22px;
}

.login-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: #111 !important;
  border: 1px solid #111;
  padding: 5px 14px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.login-link:hover {
  background: #111;
  color: #fff !important;
}

.search-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  display: flex;
  align-items: center;
  padding: 0;
  transition: color 0.15s;
}

.search-toggle:hover {
  color: #111;
}

.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.hamburger span {
  display: block;
  width: 22px;
  height: 2px;
  background: #333;
  border-radius: 2px;
}

.mobile-menu {
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: sticky;
  top: 56px;
  z-index: 99;
}

.mobile-menu a {
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
  color: #333;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
}

.mobile-menu a:last-child { border-bottom: none; }

.header-search-bar {
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  padding: 0 20px;
}

.header-search-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  height: 48px;
  gap: 12px;
}

.header-search-inner form {
  flex: 1;
}

.header-search-input {
  width: 100%;
  border: none;
  outline: none;
  font-size: 0.95rem;
  color: #111;
  background: transparent;
}

.header-search-input::placeholder {
  color: #aaa;
}

.header-search-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.4rem;
  color: #888;
  line-height: 1;
  padding: 0 4px;
}

.header-search-close:hover {
  color: #333;
}

@media (max-width: 640px) {
  .hamburger { display: flex; }
  .nav .nav-link { display: none; }
}
</style>
