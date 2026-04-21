<script setup lang="ts">
import type { Lang } from '~/composables/useLang';

const APP_NAME = 'OVER REALM';
const LOGO_SRC = '/logo.png';
const router = useRouter();
const localePath = useLocalePath();
const { count } = useCart();
const { isLoggedIn, customer } = useStorefrontAuth();
const { lang, setLang, supported, labels } = useLang();

const searchOpen = ref(false);
const searchInput = ref('');
const mobileMenuOpen = ref(false);
const langMenuOpen = ref(false);

function onPickLang(l: Lang) {
  langMenuOpen.value = false;
  if (l !== lang.value) setLang(l);
}

function toggleLangMenu() {
  langMenuOpen.value = !langMenuOpen.value;
}

// Close lang menu when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.lang-switcher')) langMenuOpen.value = false;
  });
});

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
    router.push({ path: localePath('/products'), query: { search: q } });
    searchOpen.value = false;
    searchInput.value = '';
  }
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <NuxtLinkLocale to="/" class="logo" :aria-label="APP_NAME">
        <img :src="LOGO_SRC" :alt="APP_NAME" class="logo-img" />
      </NuxtLinkLocale>
      <nav class="nav">
        <NuxtLinkLocale to="/brands" class="nav-link">Brands</NuxtLinkLocale>
        <button class="search-toggle" aria-label="Search" @click="toggleSearch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="20" height="20">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>

        <!-- Language switcher -->
        <ClientOnly>
          <div class="lang-switcher">
            <button class="lang-toggle" aria-label="Language" @click="toggleLangMenu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="20" height="20">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </button>
            <div v-if="langMenuOpen" class="lang-menu">
              <button
                v-for="l in supported"
                :key="l"
                class="lang-option"
                :class="{ 'is-active': l === lang }"
                @click="onPickLang(l)"
              >
                {{ labels[l] }}
              </button>
            </div>
          </div>
        </ClientOnly>

        <NuxtLinkLocale to="/cart" class="cart-link" aria-label="Cart">
          <svg class="cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          <ClientOnly>
            <span v-if="count > 0" class="cart-badge">{{ count }}</span>
          </ClientOnly>
        </NuxtLinkLocale>
        <ClientOnly>
          <NuxtLinkLocale v-if="isLoggedIn" to="/account" class="account-link" aria-label="Account">
            <svg class="account-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </NuxtLinkLocale>
          <NuxtLinkLocale v-else to="/login" class="login-link">Sign In</NuxtLinkLocale>
        </ClientOnly>
      </nav>
      <button class="hamburger" aria-label="Menu" @click="mobileMenuOpen = !mobileMenuOpen">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>
  <!-- Mobile menu -->
  <div v-if="mobileMenuOpen" class="mobile-menu">
    <NuxtLinkLocale to="/brands" @click="mobileMenuOpen = false">Brands</NuxtLinkLocale>
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
  padding: 0 var(--site-gutter);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 0;
  min-height: 88px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  padding: 4px 0;
}

.logo-img {
  display: block;
  height: 24px;
  width: auto;
}

.nav {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav a {
  color: #555;
  text-decoration: none;
  font-size: 1rem;
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

/* Language switcher */
.lang-switcher {
  position: relative;
  display: flex;
  align-items: center;
}

.lang-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  display: flex;
  align-items: center;
  padding: 0;
  transition: color 0.15s;
}

.lang-toggle:hover {
  color: #111;
}

.lang-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  min-width: 140px;
  padding: 4px;
  z-index: 200;
}

.lang-option {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 12px;
  font-size: 0.875rem;
  color: #333;
  border-radius: 6px;
  transition: background 0.15s;
}

.lang-option:hover {
  background: #f3f4f6;
}

.lang-option.is-active {
  background: #f3f4f6;
  font-weight: 600;
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
  padding: 12px var(--site-gutter);
  display: flex;
  flex-direction: column;
  gap: 0;
  position: sticky;
  top: 88px;
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
  padding: 0 var(--site-gutter);
}

.header-search-inner {
  max-width: 1400px;
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
