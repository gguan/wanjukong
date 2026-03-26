<script setup lang="ts">
const { email, logout } = useAdminAuth();
</script>

<template>
  <ElHeader style="background: #1a1a2e; color: #fff; display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 24px">
    <span style="font-size: 1.1rem; font-weight: 600">wanjukong Admin</span>
    <ElSpace>
      <span style="font-size: 0.85rem; opacity: 0.8">{{ email }}</span>
      <ElButton size="small" text bg style="color: #fff" @click="logout">Logout</ElButton>
    </ElSpace>
  </ElHeader>
</template>
