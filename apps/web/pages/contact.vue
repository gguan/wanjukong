<script setup lang="ts">
import type { Translations } from '~/composables/useTranslations'

const STRINGS: Translations = {
  en: {
    'meta.title': 'Contact — Over Realm',
    'meta.description': 'Get in touch with the Over Realm customer service team.',
    'info.title': 'Contact OR',
    'info.lede1': 'Please complete the customer service form. Our staff will respond during business hours.',
    'info.lede2': '(M–F 10:00 – 18:00, China Timezone)',
    'panel.office.label': 'Office visits by appointment only',
    'panel.office.name': 'Over Realm Limited',
    'panel.office.address': 'Shenzhen, China',
    'panel.customerService.label': 'Customer service',
    'panel.wholesale.label': 'Wholesale inquiries',
    'panel.wholesale.text': 'For wholesale and stockist requests, email {email}.',
    'panel.orderHelp.label': 'Order help',
    'panel.orderHelp.text': 'Please include your order number ({code}) so we can help you faster.',
    'form.name': 'Name',
    'form.email': 'Email',
    'form.subject': 'Subject',
    'form.orderNumber': 'Order Number',
    'form.message': 'Message',
    'form.errorRequired': 'Please fill in all required fields.',
    'form.errorGeneric': 'Failed to send. Please try again or email us directly.',
    'form.submit': 'Submit',
    'form.submitting': 'Sending…',
    'form.successTitle': 'Thank you!',
    'form.successBody': "Your message has been received. We'll reply to {email} during business hours.",
  },
  ja: {
    'meta.title': 'お問い合わせ — Over Realm',
    'meta.description': 'Over Realm カスタマーサービスチームへのお問い合わせはこちらから。',
    'info.title': 'Contact OR',
    'info.lede1': 'お問い合わせフォームにご記入ください。営業時間内に担当者よりご返信いたします。',
    'info.lede2': '（月〜金 10:00 – 18:00、中国時間）',
    'panel.office.label': 'オフィス訪問は事前予約制',
    'panel.office.name': 'Over Realm Limited',
    'panel.office.address': '中国 深圳',
    'panel.customerService.label': 'カスタマーサービス',
    'panel.wholesale.label': '卸売に関するお問い合わせ',
    'panel.wholesale.text': '卸売・取扱店舗をご希望の方は {email} までご連絡ください。',
    'panel.orderHelp.label': 'ご注文に関するサポート',
    'panel.orderHelp.text': '迅速に対応できるよう、ご注文番号（{code}）をご記入ください。',
    'form.name': 'お名前',
    'form.email': 'メールアドレス',
    'form.subject': '件名',
    'form.orderNumber': '注文番号',
    'form.message': 'メッセージ',
    'form.errorRequired': '必須項目をすべてご入力ください。',
    'form.errorGeneric': '送信に失敗しました。再度お試しいただくか、直接メールでご連絡ください。',
    'form.submit': '送信',
    'form.submitting': '送信中…',
    'form.successTitle': 'ありがとうございます',
    'form.successBody': 'メッセージを受け付けました。営業時間内に {email} 宛にご返信いたします。',
  },
  'zh-CN': {
    'meta.title': '联系我们 — Over Realm',
    'meta.description': '与 Over Realm 客户服务团队取得联系。',
    'info.title': '联系 OR',
    'info.lede1': '请填写客服表单。我们的工作人员将在工作时间回复您。',
    'info.lede2': '（周一至周五 10:00 – 18:00，中国时区）',
    'panel.office.label': '办公室仅接受预约访问',
    'panel.office.name': 'Over Realm Limited',
    'panel.office.address': '中国 深圳',
    'panel.customerService.label': '客户服务',
    'panel.wholesale.label': '批发业务咨询',
    'panel.wholesale.text': '如需批发或成为经销商，请发送邮件至 {email}。',
    'panel.orderHelp.label': '订单帮助',
    'panel.orderHelp.text': '请在邮件中附上订单编号（{code}），以便我们更快为您处理。',
    'form.name': '姓名',
    'form.email': '邮箱',
    'form.subject': '主题',
    'form.orderNumber': '订单编号',
    'form.message': '留言内容',
    'form.errorRequired': '请填写所有必填项。',
    'form.errorGeneric': '发送失败。请重试或直接给我们发邮件。',
    'form.submit': '提交',
    'form.submitting': '发送中…',
    'form.successTitle': '感谢您的留言！',
    'form.successBody': '我们已收到您的消息，将在工作时间回复至 {email}。',
  },
  'zh-TW': {
    'meta.title': '聯絡我們 — Over Realm',
    'meta.description': '與 Over Realm 客服團隊取得聯繫。',
    'info.title': '聯絡 OR',
    'info.lede1': '請填寫客服表單。我們的人員將在營業時間內回覆您。',
    'info.lede2': '（週一至週五 10:00 – 18:00，中國時區）',
    'panel.office.label': '辦公室僅接受預約訪問',
    'panel.office.name': 'Over Realm Limited',
    'panel.office.address': '中國 深圳',
    'panel.customerService.label': '客戶服務',
    'panel.wholesale.label': '批發業務洽詢',
    'panel.wholesale.text': '如需批發或成為經銷商，請寄信至 {email}。',
    'panel.orderHelp.label': '訂單協助',
    'panel.orderHelp.text': '請於信件中附上訂單編號（{code}），以便我們更快為您處理。',
    'form.name': '姓名',
    'form.email': '電子郵件',
    'form.subject': '主旨',
    'form.orderNumber': '訂單編號',
    'form.message': '留言內容',
    'form.errorRequired': '請填寫所有必填欄位。',
    'form.errorGeneric': '傳送失敗。請重試或直接寄信給我們。',
    'form.submit': '送出',
    'form.submitting': '傳送中…',
    'form.successTitle': '感謝您的來信！',
    'form.successBody': '我們已收到您的訊息，將於營業時間內回覆至 {email}。',
  },
}

const { t } = useTranslations(STRINGS)

useSeoMeta({
  title: () => t('meta.title'),
  description: () => t('meta.description'),
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
  t('panel.wholesale.text', {
    email: '<a href="mailto:wholesale@overrealm.shop">wholesale@overrealm.shop</a>',
  })
)

const orderHelpHtml = computed(() =>
  t('panel.orderHelp.text', { code: '<code>WJK-XXXXXXXX-XXXXX</code>' })
)

const successBodyHtml = computed(() =>
  t('form.successBody', {
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
    error.value = t('form.errorRequired')
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
      t('form.errorGeneric')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <h1 class="info-title">{{ t('info.title') }}</h1>
      <p class="info-lede">
        {{ t('info.lede1') }}
        <br />{{ t('info.lede2') }}
      </p>
    </header>

    <div class="contact-layout">
      <!-- Left: info panels -->
      <aside class="contact-info">
        <div class="info-panel">
          <p class="panel-label">{{ t('panel.office.label') }}</p>
          <p class="panel-value">
            {{ t('panel.office.name') }}<br />
            {{ t('panel.office.address') }}
          </p>
        </div>

        <div class="info-panel">
          <p class="panel-label">{{ t('panel.customerService.label') }}</p>
          <p class="panel-value">
            <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>
          </p>
        </div>

        <div class="info-panel">
          <p class="panel-label">{{ t('panel.wholesale.label') }}</p>
          <p class="panel-value" v-html="wholesaleHtml"></p>
        </div>

        <div class="info-panel">
          <p class="panel-label">{{ t('panel.orderHelp.label') }}</p>
          <p class="panel-value" v-html="orderHelpHtml"></p>
        </div>
      </aside>

      <!-- Right: form -->
      <section class="contact-form">
        <div v-if="submitted" class="form-success">
          <h2 class="success-title">{{ t('form.successTitle') }}</h2>
          <p class="success-body" v-html="successBodyHtml"></p>
        </div>

        <form v-else class="form" @submit.prevent="submit">
          <label class="field">
            <span class="field-label">{{ t('form.name') }} <span class="req">*</span></span>
            <input v-model="form.name" type="text" class="field-input" required />
          </label>

          <label class="field">
            <span class="field-label">{{ t('form.email') }} <span class="req">*</span></span>
            <input v-model="form.email" type="email" class="field-input" required />
          </label>

          <label class="field">
            <span class="field-label">{{ t('form.subject') }} <span class="req">*</span></span>
            <input v-model="form.subject" type="text" class="field-input" required />
          </label>

          <label class="field">
            <span class="field-label">{{ t('form.orderNumber') }}</span>
            <input
              v-model="form.orderNumber"
              type="text"
              class="field-input"
              placeholder="WJK-XXXXXXXX-XXXXX"
              inputmode="numeric"
            />
          </label>

          <label class="field">
            <span class="field-label">{{ t('form.message') }} <span class="req">*</span></span>
            <textarea
              v-model="form.message"
              class="field-input field-textarea"
              rows="6"
              required
            />
          </label>

          <p v-if="error" class="form-error">{{ error }}</p>

          <button type="submit" class="form-submit" :disabled="submitting">
            {{ submitting ? t('form.submitting') : t('form.submit') }}
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
