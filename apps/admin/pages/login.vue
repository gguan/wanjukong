<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' });

const { login } = useAdminAuth();
const config = useRuntimeConfig();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

// TCaptcha state
const captchaAppId = String(config.public.captchaAppId || '');
const captchaVerified = ref(false);
const captchaTicket = ref('');
const captchaRandstr = ref('');
const captchaContainerRef = ref<HTMLElement | null>(null);
const captchaLoadError = ref('');
let captchaInstance: any = null;

const canSubmit = computed(() =>
  email.value && password.value && (captchaVerified.value || !captchaAppId),
);

onMounted(() => {
  if (!captchaAppId) return;

  // Load TCaptcha 2.0 SDK
  const script = document.createElement('script');
  script.src = 'https://turing.captcha.qcloud.com/TJCaptcha.js';
  script.onload = () => initCaptcha();
  document.head.appendChild(script);
});

function initCaptcha() {
  const TencentCaptcha = (window as any).TencentCaptcha;
  if (!TencentCaptcha || !captchaContainerRef.value) return;

  captchaVerified.value = false;
  captchaTicket.value = '';
  captchaRandstr.value = '';
  captchaLoadError.value = '';

  captchaInstance = new TencentCaptcha(
    captchaContainerRef.value,
    captchaAppId,
    (res: any) => {
      // `trerror_` prefix means Tencent's own config/service failed (error 1006
      // etc.) and the SDK is "softly" calling us back with a fake success so
      // the form doesn't hang. If we trust it, we'd ship an invalid ticket.
      // Most common cause: the captchaAppId is not allowlisted for the current
      // domain in the Tencent Captcha console. Surface a clear error instead.
      const isFallback = typeof res.ticket === 'string' && res.ticket.startsWith('trerror_');
      if (res.ret === 0 && !isFallback) {
        captchaVerified.value = true;
        captchaTicket.value = res.ticket;
        captchaRandstr.value = res.randstr;
      } else {
        captchaVerified.value = false;
        if (isFallback) {
          captchaLoadError.value =
            `验证码加载失败（${res.errorMessage || res.errorCode || 'unknown'}）。` +
            `请确认 Tencent Captcha 控制台已将当前域名加入白名单，或联系管理员。`;
        }
      }
    },
    { type: 'embed' },
  );
  captchaInstance.show();
}

function resetCaptcha() {
  captchaVerified.value = false;
  captchaTicket.value = '';
  captchaRandstr.value = '';
  if (captchaInstance) {
    try { captchaInstance.destroy(); } catch {}
  }
  nextTick(() => initCaptcha());
}

async function handleLogin() {
  if (!canSubmit.value) return;
  loading.value = true;
  error.value = '';
  try {
    await login(email.value, password.value, {
      captchaTicket: captchaTicket.value || undefined,
      captchaRandstr: captchaRandstr.value || undefined,
    });
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || '登录失败';
    resetCaptcha();
  } finally {
    loading.value = false;
  }
}
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

      <!-- TCaptcha embedded -->
      <div v-if="captchaAppId" class="captcha-section">
        <div v-show="!captchaVerified" ref="captchaContainerRef" class="captcha-embed" />
        <div v-if="captchaVerified" class="captcha-success">✓ 验证通过</div>
        <div v-if="captchaLoadError" class="captcha-error">{{ captchaLoadError }}</div>
      </div>

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

.captcha-section {
  margin-bottom: 16px;
}

.captcha-embed {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  min-height: 80px;
}

.captcha-success {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #16a34a;
  font-weight: 500;
}

.captcha-error {
  margin-top: 8px;
  font-size: 0.82rem;
  line-height: 1.5;
  color: #b45309;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 8px 12px;
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
