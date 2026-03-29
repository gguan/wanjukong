<script setup lang="ts">
useSeoMeta({ title: 'Contact — Wanjukong', description: 'Get in touch with the Wanjukong team.' })
</script>

<template>
  <div class="page-container info-page">
    <h1 class="page-title">Contact Us</h1>
    <div class="info-content">
      <p>Have a question about an order or product? We're here to help.</p>
      <div class="contact-card">
        <h2>Email</h2>
        <p><a href="mailto:support@overrealm.shop">support@overrealm.shop</a></p>
      </div>
      <div class="contact-card">
        <h2>Response Time</h2>
        <p>We typically respond within 1–2 business days.</p>
      </div>
      <div class="contact-card">
        <h2>Order Issues</h2>
        <p>For questions about a specific order, please include your order number (WJK-XXXXXXXX-XXXXX) in your message.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-page { max-width: 720px; }
.info-content p { color: #444; line-height: 1.75; margin: 0 0 14px; }
.info-content a { color: #111; }
.contact-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px 24px; margin-bottom: 16px; }
.contact-card h2 { font-size: 1rem; font-weight: 600; margin: 0 0 8px; color: #111; }
.contact-card p { margin: 0; color: #555; }
</style>
