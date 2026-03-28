<script setup lang="ts">
const { user, email, logout } = useAdminAuth();
</script>

<template>
  <ElHeader class="admin-header">
    <span class="admin-header__logo">wanjukong</span>
    <ElSpace>
      <span v-if="user" class="admin-header__user">
        {{ user.name || email }}
      </span>
      <ElButton size="small" text bg style="color: rgba(255,255,255,0.85)" @click="logout">退出登录</ElButton>
    </ElSpace>
  </ElHeader>
</template>

<style scoped>
.admin-header {
  background: var(--wk-admin-header-bg, #1a1a1a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  border-bottom: none;
}

.admin-header__logo {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.admin-header__user {
  font-size: 12px;
  opacity: 0.7;
}
</style>
