<script setup lang="ts">
useSeoMeta({ title: 'FAQ — Wanjukong', description: 'Frequently asked questions about ordering, shipping and products at Wanjukong.' })

const faqs = [
  { q: 'What payment methods do you accept?', a: 'We accept PayPal for all orders. PayPal supports payment by credit card, debit card, or PayPal balance.' },
  { q: 'Do you ship internationally?', a: 'Yes! We offer free worldwide shipping on all orders. Delivery times vary by region — see our Shipping page for details.' },
  { q: 'What is a pre-order?', a: 'Pre-orders allow you to reserve a figure before it is manufactured and shipped. You pay in advance, and we ship when the item arrives from the manufacturer. Estimated ship dates are shown on each product page.' },
  { q: 'Can I cancel a pre-order?', a: 'Pre-orders can be cancelled before the item ships. Contact us at support@overrealm.shop with your order number.' },
  { q: 'How do I track my order?', a: 'Once your order ships, you will receive a tracking number by email. You can also view your order status in your account.' },
  { q: 'What is the difference between 1/6, 1/4, and 1/12 scale?', a: 'Scale refers to the figure\'s size relative to a real human. 1/6 scale figures are approximately 30cm tall, 1/4 scale are around 45cm, and 1/12 scale are approximately 15cm.' },
  { q: 'Are the figures in original manufacturer packaging?', a: 'Yes, all figures are brand new and sold in original manufacturer packaging.' },
  { q: 'How do I contact customer support?', a: 'Email us at support@overrealm.shop. We respond within 1–2 business days.' },
]
</script>

<template>
  <div class="page-container info-page">
    <h1 class="page-title">Frequently Asked Questions</h1>
    <div class="faq-list">
      <div v-for="(item, idx) in faqs" :key="idx" class="faq-item">
        <h2 class="faq-q">{{ item.q }}</h2>
        <p class="faq-a">{{ item.a }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-page { max-width: 720px; }
.faq-item { border-bottom: 1px solid #e5e7eb; padding: 20px 0; }
.faq-item:last-child { border-bottom: none; }
.faq-q { font-size: 1rem; font-weight: 600; margin: 0 0 8px; color: #111; }
.faq-a { font-size: 0.9rem; color: #555; line-height: 1.7; margin: 0; }
</style>
