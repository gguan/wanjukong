<script setup lang="ts">
definePageMeta({ layout: false });

const { login } = useAdminAuth();

const email = ref('admin@wanjukong.com');
const password = ref('');

function handleLogin() {
  if (email.value) {
    login(email.value);
  }
}
</script>

<template>
  <div class="login-page">
    <form class="login-form" @submit.prevent="handleLogin">
      <h1>Admin Login</h1>

      <label>
        Email
        <input v-model="email" type="email" placeholder="admin@wanjukong.com" required />
      </label>

      <label>
        Password
        <input v-model="password" type="password" placeholder="any password" />
      </label>

      <button type="submit">Login</button>

      <p class="login-form__hint">Any email/password works (fake auth)</p>
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
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 380px;
}

.login-form h1 {
  margin: 0 0 24px;
  font-size: 1.5rem;
  text-align: center;
}

.login-form label {
  display: block;
  margin-bottom: 16px;
  font-size: 0.875rem;
  color: #555;
}

.login-form input {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.login-form button {
  width: 100%;
  padding: 10px;
  background: #1a1a2e;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.login-form button:hover {
  background: #2d2d4e;
}

.login-form__hint {
  margin-top: 16px;
  text-align: center;
  font-size: 0.75rem;
  color: #999;
}
</style>
