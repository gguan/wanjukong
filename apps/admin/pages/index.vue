<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const api = useAdminApi();

const healthData = ref<{ ok: boolean; service: string; database?: string } | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

async function checkHealth() {
  loading.value = true;
  error.value = null;
  healthData.value = null;

  try {
    healthData.value = await api.get('/api/health');
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to connect to API';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="admin-layout">
    <LayoutAdminHeader />
    <div class="admin-layout__body">
      <LayoutAdminSidebar />
      <main class="admin-layout__content">
        <h2>Dashboard</h2>
        <p>Welcome to the wanjukong admin panel.</p>

        <div class="health-section">
          <button :disabled="loading" @click="checkHealth">
            {{ loading ? 'Checking...' : 'Check API Health' }}
          </button>

          <div v-if="healthData" class="result success">
            <pre>{{ JSON.stringify(healthData, null, 2) }}</pre>
          </div>

          <div v-if="error" class="result error">
            <p>{{ error }}</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: system-ui, -apple-system, sans-serif;
}

.admin-layout__body {
  display: flex;
  flex: 1;
}

.admin-layout__content {
  flex: 1;
  padding: 24px 32px;
}

h2 {
  margin: 0 0 8px;
  font-size: 1.5rem;
}

p {
  color: #666;
}

.health-section {
  margin-top: 24px;
}

button {
  padding: 8px 20px;
  background: #1a1a2e;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

button:hover {
  background: #2d2d4e;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result {
  margin-top: 16px;
  padding: 12px;
  border-radius: 4px;
  max-width: 400px;
}

.result.success {
  background: #f0fdf4;
  border: 1px solid #86efac;
}

.result.error {
  background: #fef2f2;
  border: 1px solid #fca5a5;
  color: #b91c1c;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  font-size: 0.85rem;
}
</style>
