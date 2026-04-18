<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' });

const { login, fetchCaptcha } = useAdminAuth();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

// Local SVG captcha — fetched from /api/admin/auth/captcha.
const captchaId = ref('');
const captchaSvg = ref('');
const captchaAnswer = ref('');
const captchaLoading = ref(false);
const captchaError = ref('');

const canSubmit = computed(
  () =>
    !!email.value &&
    !!password.value &&
    !!captchaId.value &&
    !!captchaAnswer.value,
);

function extractErrorMessage(e: any, fallback: string) {
  const message =
    e?.data?.message ??
    e?.response?._data?.message ??
    e?.response?.data?.message ??
    e?.message;

  if (Array.isArray(message)) {
    return message.find((item) => typeof item === 'string' && item.trim()) || fallback;
  }

  return typeof message === 'string' && message.trim() ? message : fallback;
}

async function refreshCaptcha() {
  captchaLoading.value = true;
  captchaError.value = '';
  captchaAnswer.value = '';
  try {
    const res = await fetchCaptcha();
    captchaId.value = res.id;
    captchaSvg.value = res.svg;
  } catch (e: any) {
    captchaError.value = extractErrorMessage(e, '验证码加载失败');
  } finally {
    captchaLoading.value = false;
  }
}

onMounted(() => {
  refreshCaptcha();
});

async function handleLogin() {
  if (!canSubmit.value) return;
  loading.value = true;
  error.value = '';
  try {
    await login(email.value, password.value, {
      captchaId: captchaId.value,
      captchaAnswer: captchaAnswer.value,
    });
  } catch (e: any) {
    error.value = extractErrorMessage(e, '登录失败');
    // Captcha is single-use on the server — always refresh after a failed
    // attempt so the next submit starts with a fresh challenge.
    await refreshCaptcha();
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-form" @keydown.enter.prevent="handleLogin">
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
            v-model="captchaAnswer"
            type="text"
            placeholder="请输入右侧字符"
            required
            autocomplete="off"
            spellcheck="false"
            maxlength="8"
            class="captcha-input"
          />
          <button
            type="button"
            class="captcha-svg"
            :disabled="captchaLoading"
            :title="captchaLoading ? '加载中' : '点击刷新验证码'"
            @click="refreshCaptcha"
          >
            <span v-if="captchaLoading" class="captcha-placeholder">...</span>
            <span v-else-if="captchaError" class="captcha-placeholder captcha-placeholder--error">
              加载失败
            </span>
            <!-- v-html is safe here: SVG comes from our own API and is not user-controlled -->
            <span v-else class="captcha-svg__inner" v-html="captchaSvg" />
          </button>
        </div>
      </label>

      <button type="button" class="login-submit" :disabled="loading || !canSubmit" @click="handleLogin">
        {{ loading ? '登录中...' : '登录' }}
      </button>
    </div>
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
  max-width: 400px;
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
  align-items: stretch;
  gap: 10px;
  margin-top: 6px;
}

.captcha-input {
  flex: 1;
  margin-top: 0 !important;
}

.captcha-svg {
  width: 140px;
  height: 44px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, opacity 0.15s;
}

.captcha-svg:hover:not(:disabled) {
  border-color: #111;
}

.captcha-svg:disabled {
  opacity: 0.6;
  cursor: wait;
}

.captcha-svg__inner :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.captcha-placeholder {
  font-size: 0.85rem;
  color: #888;
}

.captcha-placeholder--error {
  color: #b45309;
}

.login-submit {
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

.login-submit:hover:not(:disabled) {
  background: #333;
}

.login-submit:disabled {
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
