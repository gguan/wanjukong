<script setup lang="ts">
import { APP_NAME } from '@wanjukong/shared';

const config = useRuntimeConfig();

const healthData = ref<{ ok: boolean; service: string } | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);

async function checkHealth() {
  loading.value = true;
  error.value = null;
  healthData.value = null;

  try {
    const data = await $fetch<{ ok: boolean; service: string }>(
      `${config.public.apiBase}/api/health`,
    );
    healthData.value = data;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to connect to API';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="container">
    <h1>{{ APP_NAME }}</h1>
    <p>Minimal Nuxt 3 + NestJS monorepo skeleton</p>

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
</template>

<style scoped>
.container {
  max-width: 600px;
  margin: 80px auto;
  padding: 0 20px;
  font-family: system-ui, -apple-system, sans-serif;
  text-align: center;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

p {
  color: #666;
  margin-bottom: 2rem;
}

button {
  padding: 10px 24px;
  font-size: 1rem;
  border: 1px solid #333;
  background: #333;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background: #555;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result {
  margin-top: 1.5rem;
  padding: 16px;
  border-radius: 6px;
  text-align: left;
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
}
</style>
