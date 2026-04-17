<script setup lang="ts">
useSeoMeta({
  title: 'Contact — Wanjukong',
  description: 'Get in touch with the Wanjukong team.',
})

// Placeholder form — wire to backend when contact endpoint exists.
const form = reactive({ name: '', email: '', orderNo: '', subject: 'general', message: '' })
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
    error.value = 'Please fill in your name, email and message.'
    return
  }
  submitting.value = true
  try {
    // TODO: Wire to /api/public/contact endpoint when available.
    await new Promise((r) => setTimeout(r, 600))
    submitted.value = true
  } catch (e: any) {
    error.value = e?.message || 'Failed to send. Please try again or email us directly.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">Contact</p>
      <h1 class="info-title">Let's talk.</h1>
      <p class="info-lede">
        <!-- TODO: Replace with your preferred greeting. -->
        Questions about an order, a pre-order, a product detail, or anything else?
        We read every message personally.
      </p>
    </header>

    <div class="contact-layout">
      <!-- Left: info panels -->
      <aside class="contact-info">
        <div class="info-panel">
          <p class="panel-label">Email</p>
          <p class="panel-value">
            <!-- TODO: Replace with your support email. -->
            <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>
          </p>
        </div>

        <div class="info-panel">
          <p class="panel-label">Response Time</p>
          <p class="panel-value">
            <!-- TODO: Confirm response SLA. -->
            Within 1–2 business days, often sooner.
          </p>
        </div>

        <div class="info-panel">
          <p class="panel-label">Order Help</p>
          <p class="panel-value">
            Include your order number
            <!-- TODO: Replace with your actual order number format. -->
            (<code>WJK-XXXXXXXX-XXXXX</code>) so we can help faster.
          </p>
        </div>

        <div class="info-panel">
          <p class="panel-label">Business Hours</p>
          <p class="panel-value">
            <!-- TODO: Replace with your time zone and hours. -->
            Monday – Friday, 10:00 – 18:00 (UTC+8)
          </p>
        </div>
      </aside>

      <!-- Right: form -->
      <section class="contact-form">
        <div v-if="submitted" class="form-success">
          <h2 class="success-title">Thanks — we got it.</h2>
          <p class="success-body">
            Your message is in. We'll reply to <strong>{{ form.email }}</strong> within 1–2 business days.
          </p>
        </div>

        <form v-else class="form" @submit.prevent="submit">
          <div class="form-row">
            <label class="field">
              <span class="field-label">Name</span>
              <input v-model="form.name" type="text" class="field-input" required />
            </label>
            <label class="field">
              <span class="field-label">Email</span>
              <input v-model="form.email" type="email" class="field-input" required />
            </label>
          </div>

          <div class="form-row">
            <label class="field">
              <span class="field-label">Order No. (optional)</span>
              <input v-model="form.orderNo" type="text" class="field-input" placeholder="WJK-XXXXXXXX-XXXXX" />
            </label>
            <label class="field">
              <span class="field-label">Subject</span>
              <select v-model="form.subject" class="field-input">
                <option value="general">General Question</option>
                <option value="order">Order Issue</option>
                <option value="preorder">Pre-order Question</option>
                <option value="return">Return / Refund</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <label class="field field-block">
            <span class="field-label">Message</span>
            <textarea v-model="form.message" class="field-input field-textarea" rows="6" required />
          </label>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button type="submit" class="form-submit" :disabled="submitting">
            {{ submitting ? 'Sending…' : 'Send Message' }}
          </button>
        </form>
      </section>
    </div>
  </article>
</template>

<style scoped>
.info {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 8vw;
}

.info-hero {
  margin-bottom: 72px;
  max-width: 780px;
}

.info-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #888;
  margin: 0 0 20px;
}

.info-title {
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0 0 28px;
  color: #0a0a0a;
}

.info-lede {
  font-size: 1.15rem;
  line-height: 1.6;
  color: #444;
  margin: 0;
  max-width: 580px;
}

.contact-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 72px;
  align-items: start;
}

/* ─── Info panels ─────────────────────────────────────── */
.contact-info {
  display: flex;
  flex-direction: column;
  gap: 32px;
  border-top: 1px solid #eee;
  padding-top: 32px;
}

.info-panel {
  /* no card chrome — reads as editorial sidebar */
}

.panel-label {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #999;
  margin: 0 0 8px;
}

.panel-value {
  font-size: 0.95rem;
  color: #111;
  line-height: 1.6;
  margin: 0;
}

.panel-value a {
  color: #0a0a0a;
  text-decoration: none;
  border-bottom: 1px solid #0a0a0a;
  padding-bottom: 1px;
}

.panel-value code {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.85rem;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
}

/* ─── Form ────────────────────────────────────────────── */
.contact-form {
  border-top: 1px solid #eee;
  padding-top: 32px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-block {
  /* full width within form */
}

.field-label {
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #999;
}

.field-input {
  border: none;
  border-bottom: 1px solid #ddd;
  padding: 10px 0;
  font-size: 1rem;
  font-family: inherit;
  color: #111;
  background: transparent;
  transition: border-color 0.2s;
}

.field-input:focus {
  outline: none;
  border-bottom-color: #0a0a0a;
}

.field-input::placeholder {
  color: #bbb;
}

.field-textarea {
  resize: vertical;
  min-height: 140px;
  line-height: 1.6;
  border: 1px solid #eee;
  padding: 12px 14px;
}

.field-textarea:focus {
  border-color: #0a0a0a;
}

.form-error {
  margin: 0;
  color: #b91c1c;
  font-size: 0.9rem;
}

.form-submit {
  align-self: flex-start;
  padding: 14px 36px;
  background: #0a0a0a;
  color: #fff;
  border: 1px solid #0a0a0a;
  font-size: 0.85rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s, color 0.2s;
}

.form-submit:hover:not(:disabled) {
  background: #fff;
  color: #0a0a0a;
}

.form-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-success {
  padding: 40px 0;
  border-top: 1px solid #eee;
}

.success-title {
  font-size: 1.6rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0 0 16px;
  color: #0a0a0a;
}

.success-body {
  font-size: 1rem;
  color: #555;
  line-height: 1.6;
  margin: 0;
}

/* ─── Responsive ──────────────────────────────────────── */
@media (max-width: 900px) {
  .contact-layout {
    grid-template-columns: 1fr;
    gap: 48px;
  }
}

@media (max-width: 600px) {
  .info {
    padding: 48px 24px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
