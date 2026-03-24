<script setup lang="ts">
import { APP_NAME } from '@wanjukong/shared';

const { email, logout } = useAdminAuth();
</script>

<template>
  <header class="admin-header">
    <div class="admin-header__title">{{ APP_NAME }} Admin</div>
    <div class="admin-header__user">
      <span>{{ email }}</span>
      <button @click="logout">Logout</button>
    </div>
  </header>
</template>

<style scoped>
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: #1a1a2e;
  color: #fff;
}

.admin-header__title {
  font-size: 1.1rem;
  font-weight: 600;
}

.admin-header__user {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
}

.admin-header__user button {
  padding: 4px 12px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.admin-header__user button:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
