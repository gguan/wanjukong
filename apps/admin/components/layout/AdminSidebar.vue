<template>
  <aside class="admin-sidebar">
    <nav>
      <NuxtLink to="/" class="admin-sidebar__link">Dashboard</NuxtLink>
      <NuxtLink to="/brands" class="admin-sidebar__link">Brands</NuxtLink>
      <NuxtLink to="/categories" class="admin-sidebar__link">Categories</NuxtLink>
      <NuxtLink to="/products" class="admin-sidebar__link">Products</NuxtLink>
    </nav>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  width: 200px;
  min-height: 0;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  padding: 16px 0;
}

.admin-sidebar__link {
  display: block;
  padding: 10px 24px;
  color: #333;
  text-decoration: none;
  font-size: 0.9rem;
}

.admin-sidebar__link:hover,
.admin-sidebar__link.router-link-active {
  background: #e8e8e8;
  color: #1a1a2e;
  font-weight: 500;
}
</style>
