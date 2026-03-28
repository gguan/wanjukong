<script setup lang="ts">
const route = useRoute();
const navItems = useAdminNav();
</script>

<template>
  <ElAside width="var(--wk-admin-sidebar-width)" class="admin-sidebar">
    <ElMenu
      :default-active="route.path"
      router
      class="admin-sidebar__menu"
    >
      <ElMenuItem
        v-for="item in navItems"
        :key="item.to"
        :index="item.to"
      >
        <span>{{ item.label }}</span>
      </ElMenuItem>
    </ElMenu>
  </ElAside>
</template>

<style scoped>
.admin-sidebar {
  background: #f6f6f7;
  border-right: 1px solid var(--wk-admin-border);
}

.admin-sidebar__menu {
  border-right: none;
  padding: 8px 0;
  background: transparent;
}
</style>
