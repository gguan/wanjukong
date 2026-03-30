<script setup lang="ts">
import type { NavItem } from '~/composables/useAdminNav';

const route = useRoute();
const navItems = useAdminNav();

// Group items by their group label
const groupedItems = computed(() => {
  const groups: { label: string; items: NavItem[] }[] = [];
  let currentGroup = '';
  for (const item of navItems) {
    const g = item.group || '';
    if (g !== currentGroup) {
      currentGroup = g;
      groups.push({ label: g, items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
});
</script>

<template>
  <ElAside width="var(--wk-admin-sidebar-width)" class="admin-sidebar">
    <nav class="admin-sidebar__nav">
      <template v-for="(group, gi) in groupedItems" :key="gi">
        <div v-if="gi > 0" class="admin-sidebar__divider" />
        <ul class="admin-sidebar__group">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="admin-sidebar__item"
              :class="{ 'is-active': route.path === item.to }"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </template>
    </nav>
  </ElAside>
</template>

<style scoped>
.admin-sidebar {
  background: #f6f6f7;
  border-right: 1px solid var(--wk-admin-border);
  overflow-y: auto;
}

.admin-sidebar__nav {
  padding: 12px 0;
}

.admin-sidebar__group {
  list-style: none;
  margin: 0;
  padding: 0;
}

.admin-sidebar__divider {
  height: 1px;
  background: var(--wk-admin-border);
  margin: 8px 16px;
}

.admin-sidebar__item {
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 12px 0 16px;
  margin: 2px 8px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 450;
  color: var(--el-text-color-regular);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  position: relative;
  cursor: pointer;
}

.admin-sidebar__item:hover {
  background: #ebebeb;
  color: var(--el-text-color-primary);
}

.admin-sidebar__item.is-active {
  background: #f1f1f1;
  color: #303030;
  font-weight: 550;
}

.admin-sidebar__item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #303030;
}
</style>
