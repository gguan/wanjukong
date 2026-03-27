<script setup lang="ts">
const { verifyEmail } = useStorefrontAuth();
const route = useRoute();

const loading = ref(true);
const success = ref(false);
const error = ref('');

onMounted(async () => {
  const token = route.query.token as string;
  if (!token) {
    error.value = 'Missing verification token.';
    loading.value = false;
    return;
  }
  try {
    await verifyEmail(token);
    success.value = true;
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Invalid or expired verification link.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="page-container">
    <div class="auth-card">
      <h1 class="auth-title">Email Verification</h1>

      <div v-if="loading" class="status-message">
        <p class="status-text">Verifying your email...</p>
      </div>

      <div v-else-if="success" class="success-message">
        <p class="success-text">Your email has been verified.</p>
        <p class="success-sub">You can now sign in to your account.</p>
        <NuxtLink to="/login" class="auth-btn-link">Sign In</NuxtLink>
      </div>

      <div v-else class="error-message">
        <p class="error-text">{{ error }}</p>
        <p class="error-sub">The link may have expired. Please try registering again or request a new verification email.</p>
      </div>
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
  text-align: center;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 20px;
  color: #111;
}

.status-message {
  padding: 20px 0;
}

.status-text {
  font-size: 0.9rem;
  color: #888;
  margin: 0;
}

.success-message {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 20px;
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
  margin: 0 0 16px;
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

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 20px;
}

.error-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #991b1b;
  margin: 0 0 6px;
}

.error-sub {
  font-size: 0.85rem;
  color: #b91c1c;
  margin: 0;
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
