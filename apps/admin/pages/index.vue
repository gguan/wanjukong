<script setup lang="ts">
definePageMeta({ middleware: 'auth', layout: 'admin' });

const api = useAdminApi();

const healthData = ref<Record<string, unknown> | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

async function checkHealth() {
  loading.value = true;
  error.value = null;
  try {
    healthData.value = await api.get('/api/health');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : '连接失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h2>总览</h2>
    <p>欢迎使用 wanjukong 管理后台。</p>

    <button :disabled="loading" class="btn" @click="checkHealth">
      {{ loading ? '检查中...' : '检查接口健康状态' }}
    </button>

    <div v-if="healthData" class="result success">
      <pre>{{ JSON.stringify(healthData, null, 2) }}</pre>
    </div>
    <div v-if="error" class="result error">{{ error }}</div>
  </div>
</template>

<style scoped>
h2 { margin: 0 0 8px; }
p { color: #666; margin-bottom: 16px; }
.btn {
  padding: 8px 20px;
  background: #1a1a2e;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn:hover { background: #2d2d4e; }
.btn:disabled { opacity: 0.6; }
.result { margin-top: 12px; padding: 12px; border-radius: 4px; max-width: 400px; }
.result.success { background: #f0fdf4; border: 1px solid #86efac; }
.result.error { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; }
pre { margin: 0; white-space: pre-wrap; font-size: 0.85rem; }
</style>
