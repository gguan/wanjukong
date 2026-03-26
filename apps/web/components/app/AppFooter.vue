<script setup lang="ts">
const APP_NAME = 'wanjukong';
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <p>&copy; {{ new Date().getFullYear() }} {{ APP_NAME }}. All rights reserved.</p>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  border-top: 1px solid #e5e7eb;
  padding: 24px 20px;
  margin-top: 60px;
}

.footer-inner {
  max-width: 1100px;
  margin: 0 auto;
  text-align: center;
}

.footer-inner p {
  color: #999;
  font-size: 0.85rem;
  margin: 0;
}
</style>
