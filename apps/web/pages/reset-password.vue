<script setup lang="ts">
const { resetPassword } = useStorefrontAuth();
const route = useRoute();

const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const loading = ref(false);
const success = ref(false);

const token = route.query.token as string;

async function handleSubmit() {
  error.value = '';
  if (!token) {
    error.value = 'Missing reset token. Please use the link from your email.';
    return;
  }
  if (!password.value) {
    error.value = 'Please enter a new password.';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.';
    return;
  }
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.';
    return;
  }
  loading.value = true;
  try {
    await resetPassword(token, password.value);
    success.value = true;
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed to reset password. The link may have expired.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="page-container">
    <div class="auth-card">
      <h1 class="auth-title">Reset Password</h1>

      <template v-if="success">
        <div class="success-message">
          <p class="success-text">Your password has been reset.</p>
          <p class="success-sub">You can now sign in with your new password.</p>
        </div>
        <div class="auth-links">
          <NuxtLink to="/login" class="auth-btn-link">Sign In</NuxtLink>
        </div>
      </template>

      <template v-else>
        <p class="auth-subtitle">Enter your new password below.</p>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label class="field-label">New Password</label>
            <input
              v-model="password"
              type="password"
              class="field-input"
              placeholder="At least 8 characters"
              autocomplete="new-password"
            />
          </div>
          <div class="field">
            <label class="field-label">Confirm Password</label>
            <input
              v-model="confirmPassword"
              type="password"
              class="field-input"
              placeholder="Re-enter your password"
              autocomplete="new-password"
            />
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button type="submit" class="auth-btn" :disabled="loading">
            {{ loading ? 'Resetting...' : 'Reset Password' }}
          </button>
        </form>

        <div class="auth-links">
          <NuxtLink to="/login" class="auth-link">Back to Sign In</NuxtLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.auth-card {
  max-width: 400px;
  margin: 40px auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 36px 32px;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 6px;
  color: #111;
}

.auth-subtitle {
  font-size: 0.88rem;
  color: #888;
  margin: 0 0 28px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #555;
}

.field-input {
  height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 0.9rem;
  color: #111;
  font-family: inherit;
  background: #fff;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: #111;
}

.form-error {
  font-size: 0.85rem;
  color: #b91c1c;
  margin: 0;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

.success-message {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  text-align: center;
}

.success-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #166534;
  margin: 0 0 6px;
}

.success-sub {
  font-size: 0.85rem;
  color: #15803d;
  margin: 0;
}

.auth-btn {
  width: 100%;
  padding: 12px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  margin-top: 4px;
}

.auth-btn:hover:not(:disabled) {
  background: #333;
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-btn-link {
  display: inline-block;
  padding: 10px 28px;
  background: #111;
  color: #fff;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.auth-btn-link:hover {
  background: #333;
}

.auth-links {
  text-align: center;
  margin-top: 20px;
  font-size: 0.85rem;
}

.auth-link {
  color: #555;
  text-decoration: none;
}

.auth-link:hover {
  color: #111;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .auth-card {
    margin: 20px auto;
    padding: 28px 20px;
    border-left: none;
    border-right: none;
    border-radius: 0;
  }
}
</style>
