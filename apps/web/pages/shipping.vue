<script setup lang="ts">
useSeoMeta({ title: 'Shipping & Delivery — Wanjukong', description: 'Learn about our shipping options and delivery times.' })
</script>

<template>
  <div class="page-container info-page">
    <h1 class="page-title">Shipping & Delivery</h1>
    <div class="info-content">
      <div class="highlight-box">
        <strong>Free Worldwide Shipping</strong> on all orders.
      </div>
      <h2>Processing Time</h2>
      <p>In-stock orders are typically processed and shipped within 3–5 business days of payment confirmation.</p>
      <h2>Delivery Times</h2>
      <table class="info-table">
        <thead><tr><th>Region</th><th>Estimated Delivery</th></tr></thead>
        <tbody>
          <tr><td>United States</td><td>7–14 business days</td></tr>
          <tr><td>Europe</td><td>10–18 business days</td></tr>
          <tr><td>Asia Pacific</td><td>5–12 business days</td></tr>
          <tr><td>Rest of World</td><td>14–25 business days</td></tr>
        </tbody>
      </table>
      <h2>Pre-Order Shipping</h2>
      <p>Pre-order items ship once the product is received from the manufacturer. Estimated ship dates are shown on each product page and are subject to change based on manufacturer schedules.</p>
      <h2>Tracking</h2>
      <p>Once your order ships, you will receive a tracking number via email.</p>
    </div>
  </div>
</template>

<style scoped>
.info-page { max-width: 720px; }
.info-content h2 { font-size: 1.1rem; font-weight: 600; margin: 24px 0 10px; color: #111; }
.info-content p { color: #444; line-height: 1.75; margin: 0 0 14px; }
.highlight-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; color: #166534; font-size: 0.95rem; }
.info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.info-table th, .info-table td { padding: 10px 14px; border: 1px solid #e5e7eb; text-align: left; font-size: 0.9rem; }
.info-table th { background: #f9fafb; font-weight: 600; color: #111; }
.info-table td { color: #444; }
</style>
