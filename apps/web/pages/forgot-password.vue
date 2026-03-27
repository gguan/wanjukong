<script setup lang="ts">
const { forgotPassword } = useStorefrontAuth();

const email = ref('');
const error = ref('');
const loading = ref(false);
const submitted = ref(false);

async function handleSubmit() {
  error.value = '';
  if (!email.value) {
    error.value = 'Please enter your email address.';
    return;
  }
  loading.value = true;
  try {
    await forgotPassword(email.value);
  } catch {
    // Silently succeed for anti-enumeration
  } finally {
    loading.value = false;
    submitted.value = true;
  }
}
</script>

<template>
  <div class="page-container">
    <div class="auth-card">
      <h1 class="auth-title">Forgot Password</h1>

      <template v-if="submitted">
        <div class="success-message">
          <p class="success-text">If an account exists for that email, we've sent a password reset link.</p>
          <p class="success-sub">Please check your inbox and spam folder.</p>
        </div>
        <div class="auth-links">
          <NuxtLink to="/login" class="auth-link">Back to Sign In</NuxtLink>
        </div>
      </template>

      <template v-else>
        <p class="auth-subtitle">Enter your email and we'll send you a link to reset your password.</p>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label class="field-label">Email</label>
            <input
              v-model="email"
              type="email"
              class="field-input"
              placeholder="you@example.com"
              autocomplete="email"
            />
          </div>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button type="submit" class="auth-btn" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send Reset Link' }}
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
