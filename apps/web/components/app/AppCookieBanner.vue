<script setup lang="ts">
/**
 * Minimal cookie notice: shown once, dismissable, stored in localStorage.
 * We only use strictly-necessary cookies (session + cart + preferences), so
 * this is an informational notice — not a GDPR opt-in.
 */
const CONSENT_KEY = 'wjk-cookie-consent'

const visible = ref(false)

onMounted(() => {
  try {
    if (!localStorage.getItem(CONSENT_KEY)) visible.value = true
  } catch {
    // localStorage disabled — don't show banner since we can't remember dismissal
  }
})

function accept() {
  try {
    localStorage.setItem(CONSENT_KEY, '1')
  } catch {
    // ignore — banner just won't persist dismissal
  }
  visible.value = false
}
</script>

<template>
  <Transition name="cookie">
    <div v-if="visible" class="cookie-banner" role="region" aria-label="Cookie notice">
      <div class="cookie-inner">
        <p class="cookie-text">
          We use essential cookies to keep you signed in and remember your cart. We don't use
          tracking or advertising cookies.
          <NuxtLink to="/cookies" class="cookie-link">Learn more →</NuxtLink>
        </p>
        <button type="button" class="cookie-btn" @click="accept">OK</button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #0a0a0a;
  color: #fff;
  padding: 14px 8vw;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.cookie-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.cookie-text {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
  margin: 0;
}

.cookie-link {
  color: #fff;
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
  padding-bottom: 1px;
  margin-left: 4px;
}

.cookie-link:hover {
  border-bottom-color: #fff;
}

.cookie-btn {
  flex-shrink: 0;
  padding: 10px 28px;
  background: #fff;
  color: #0a0a0a;
  border: 1px solid #fff;
  font-size: 0.8rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.cookie-btn:hover {
  background: transparent;
  color: #fff;
}

.cookie-enter-active,
.cookie-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.cookie-enter-from,
.cookie-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (max-width: 700px) {
  .cookie-banner {
    padding: 12px 24px 14px;
  }

  .cookie-inner {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .cookie-text {
    font-size: 0.8rem;
  }

  .cookie-btn {
    align-self: flex-end;
  }
}
</style>
