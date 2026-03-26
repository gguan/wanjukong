<script setup lang="ts">
const { email, logout } = useAdminAuth();
</script>

<template>
  <ElHeader class="admin-header">
    <span class="admin-header__logo">wanjukong</span>
    <ElSpace>
      <span class="admin-header__email">{{ email }}</span>
      <ElButton size="small" text bg style="color: rgba(255,255,255,0.85)" @click="logout">Logout</ElButton>
    </ElSpace>
  </ElHeader>
</template>

<style scoped>
.admin-header {
  background: var(--wk-admin-header-bg, #111111);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 24px;
  border-bottom: none;
}

.admin-header__logo {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.admin-header__email {
  font-size: 0.8rem;
  opacity: 0.7;
}
</style>
