<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('contact.meta.title'),
  description: () => t('contact.meta.description'),
})

const { post } = usePublicApi()
const { lang } = useLang()

const form = reactive({
  name: '',
  email: '',
  subject: '',
  orderNumber: '',
  message: '',
})
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

const wholesaleHtml = computed(() =>
  t('contact.panel.wholesale.text', {
    email: '<a href="mailto:wholesale@overrealm.shop">wholesale@overrealm.shop</a>',
  })
)

const orderHelpHtml = computed(() =>
  t('contact.panel.orderHelp.text', { code: '<code>WJK-XXXXXXXX-XXXXX</code>' })
)

const successBodyHtml = computed(() =>
  t('contact.form.successBody', {
    email: `<strong>${escapeHtml(form.email)}</strong>`,
  })
)

async function submit() {
  error.value = ''
  if (
    !form.name.trim() ||
    !form.email.trim() ||
    !form.subject.trim() ||
    !form.message.trim()
  ) {
    error.value = t('contact.form.errorRequired')
    return
  }
  submitting.value = true
  try {
    await post('/public/contact', {
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      orderNumber: form.orderNumber.trim() || undefined,
      message: form.message.trim(),
      locale: lang.value,
    })
    submitted.value = true
  } catch (e: any) {
    error.value =
      e?.data?.message ||
      e?.message ||
      t('contact.form.errorGeneric')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <h1 class="info-title">{{ t('contact.info.title') }}</h1>
      <p class="info-lede">
        {{ t('contact.info.lede1') }}
        <br />{{ t('contact.info.lede2') }}
      </p>
    </header>

    <div class="contact-layout">
      <!-- Left: info panels -->
      <aside class="contact-info">
        <div class="info-panel">
          <p class="panel-label">{{ t('contact.panel.office.label') }}</p>
          <p class="panel-value">
            {{ t('contact.panel.office.name') }}<br />
            {{ t('contact.panel.office.address') }}
          </p>
        </div>

        <div class="info-panel">
          <p class="panel-label">{{ t('contact.panel.customerService.label') }}</p>
          <p class="panel-value">
            <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>
          </p>
        </div>

        <div class="info-panel">
          <p class="panel-label">{{ t('contact.panel.wholesale.label') }}</p>
          <p class="panel-value" v-html="wholesaleHtml"></p>
        </div>

        <div class="info-panel">
          <p class="panel-label">{{ t('contact.panel.orderHelp.label') }}</p>
          <p class="panel-value" v-html="orderHelpHtml"></p>
        </div>
      </aside>

      <!-- Right: form -->
      <section class="contact-form">
        <div v-if="submitted" class="form-success">
          <h2 class="success-title">{{ t('contact.form.successTitle') }}</h2>
          <p class="success-body" v-html="successBodyHtml"></p>
        </div>

        <form v-else class="form" @submit.prevent="submit">
          <label class="field">
            <span class="field-label">{{ t('contact.form.name') }} <span class="req">*</span></span>
            <input v-model="form.name" type="text" class="field-input" required />
          </label>

          <label class="field">
            <span class="field-label">{{ t('contact.form.email') }} <span class="req">*</span></span>
            <input v-model="form.email" type="email" class="field-input" required />
          </label>

          <label class="field">
            <span class="field-label">{{ t('contact.form.subject') }} <span class="req">*</span></span>
            <input v-model="form.subject" type="text" class="field-input" required />
          </label>

          <label class="field">
            <span class="field-label">{{ t('contact.form.orderNumber') }}</span>
            <input
              v-model="form.orderNumber"
              type="text"
              class="field-input"
              placeholder="WJK-XXXXXXXX-XXXXX"
              inputmode="numeric"
            />
          </label>

          <label class="field">
            <span class="field-label">{{ t('contact.form.message') }} <span class="req">*</span></span>
            <textarea
              v-model="form.message"
              class="field-input field-textarea"
              rows="6"
              required
            />
          </label>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button type="submit" class="form-submit" :disabled="submitting">
            {{ submitting ? t('contact.form.submitting') : t('contact.form.submit') }}
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

.info-title {
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0 0 28px;
  color: #0a0a0a;
}

.info-lede {
  font-size: 1.05rem;
  line-height: 1.7;
  color: #444;
  margin: 0;
  max-width: 620px;
}

.contact-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
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
  line-height: 1.65;
  margin: 0;
}

.panel-value :deep(a) {
  color: #0a0a0a;
  text-decoration: none;
  border-bottom: 1px solid #0a0a0a;
  padding-bottom: 1px;
}

.panel-value :deep(code) {
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
  max-width: 560px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #999;
}

.req {
  color: #b91c1c;
  letter-spacing: 0;
  margin-left: 2px;
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
  min-height: 160px;
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
  padding: 14px 40px;
  background: #0a0a0a;
  color: #fff;
  border: 1px solid #0a0a0a;
  font-size: 0.85rem;
  letter-spacing: 0.2em;
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
}

.success-title {
  font-size: 1.8rem;
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

.success-body :deep(strong) {
  color: #0a0a0a;
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
}
</style>
