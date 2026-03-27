<script setup lang="ts">
const APP_NAME = 'wanjukong';
const { count } = useCart();
const { isLoggedIn, customer } = useStorefrontAuth();
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <NuxtLink to="/" class="logo">{{ APP_NAME }}</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/brands">Brands</NuxtLink>
        <NuxtLink to="/products">Products</NuxtLink>
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
    </div>
  </header>
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
</style>
