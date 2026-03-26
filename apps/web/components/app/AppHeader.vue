<script setup lang="ts">
const APP_NAME = 'wanjukong';
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <NuxtLink to="/" class="logo">{{ APP_NAME }}</NuxtLink>
      <nav class="nav">
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/brands">Brands</NuxtLink>
        <NuxtLink to="/products">Products</NuxtLink>
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
</style>
