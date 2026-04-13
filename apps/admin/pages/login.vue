<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' });

const { login } = useAdminAuth();
const api = useAdminApi();

const email = ref('');
const password = ref('');
const captchaCode = ref('');
const captchaId = ref('');
const captchaSvg = ref('');
const loading = ref(false);
const error = ref('');

const canSubmit = computed(() =>
  email.value && password.value && captchaCode.value.length >= 4 && captchaId.value
);

async function loadCaptcha() {
  try {
    const res = await api.get<{ id: string; svg: string }>('/api/admin/auth/captcha');
    captchaId.value = res.id;
    captchaSvg.value = res.svg;
    captchaCode.value = '';
  } catch {
    captchaSvg.value = '';
  }
}

async function handleLogin() {
  if (!canSubmit.value) return;
  loading.value = true;
  error.value = '';
  try {
    await login(email.value, password.value, {
      captchaId: captchaId.value,
      captchaCode: captchaCode.value,
    });
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || '登录失败';
    // Refresh captcha on any error
    await loadCaptcha();
  } finally {
    loading.value = false;
  }
}

onMounted(loadCaptcha);
</script>

<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="handleLogin">
      <h1>管理后台登录</h1>

      <div v-if="error" class="login-form__error">{{ error }}</div>

      <label>
        邮箱
        <input v-model="email" type="email" placeholder="请输入邮箱" required autocomplete="email" />
      </label>

      <label>
        密码
        <input v-model="password" type="password" placeholder="请输入密码" required autocomplete="current-password" />
      </label>

      <label>
        验证码
        <div class="captcha-row">
          <input
            v-model="captchaCode"
            type="text"
            placeholder="请输入验证码"
            maxlength="4"
            autocomplete="off"
            class="captcha-input"
          />
          <div class="captcha-image" @click="loadCaptcha" title="点击刷新验证码" v-html="captchaSvg" />
        </div>
      </label>

      <button type="submit" :disabled="loading || !canSubmit">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #f0f0f0;
  font-family: system-ui, -apple-system, sans-serif;
}

.login-form {
  background: #fff;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  width: 100%;
  max-width: 380px;
}

.login-form h1 {
  margin: 0 0 24px;
  font-size: 1.5rem;
  text-align: center;
  font-weight: 700;
}

.login-form label {
  display: block;
  margin-bottom: 16px;
  font-size: 0.875rem;
  color: #555;
  font-weight: 500;
}

.login-form input {
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.login-form input:focus {
  outline: none;
  border-color: #111;
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.08);
}

.captcha-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 6px;
}

.captcha-input {
  flex: 1;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 1.1rem !important;
  font-weight: 600;
}

.captcha-image {
  flex-shrink: 0;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  height: 50px;
  display: flex;
  align-items: center;
}

.captcha-image:hover {
  border-color: #bbb;
}

.captcha-image :deep(svg) {
  display: block;
}

.login-form button {
  width: 100%;
  padding: 11px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.login-form button:hover:not(:disabled) {
  background: #333;
}

.login-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-form__error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.85rem;
  margin-bottom: 16px;
}
</style>
