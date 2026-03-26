<script setup lang="ts">
const route = useRoute();
const navItems = useAdminNav();
</script>

<template>
  <ElAside width="var(--wk-admin-sidebar-width)" style="background: #fff; border-right: 1px solid var(--wk-admin-border)">
    <ElMenu
      :default-active="route.path"
      router
      style="border-right: none; padding-top: 8px"
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
