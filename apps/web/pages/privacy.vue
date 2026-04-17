<script setup lang="ts">
useSeoMeta({
  title: 'Privacy Policy — Wanjukong',
  description: 'Privacy policy and data practices for Wanjukong.',
})
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">Legal</p>
      <h1 class="info-title">Privacy Policy</h1>
      <p class="info-updated">
        <!-- TODO: Update this date when the policy changes. -->
        Last updated: 2026-04-18
      </p>
    </header>

    <div class="info-body">
      <!-- TODO: Have legal review before publishing. Placeholder copy below. -->

      <section class="info-section">
        <h2 class="info-h2">Information We Collect</h2>
        <p>
          When you place an order, we collect your name, email address, phone number, and
          shipping address. Payment details are processed securely by PayPal — we never
          receive or store your credit card information.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">How We Use Your Information</h2>
        <ul>
          <li>To process and fulfil your orders</li>
          <li>To send order confirmations and shipping notifications</li>
          <li>To respond to customer service requests</li>
          <li>To improve our website and services</li>
          <!-- TODO: Add/remove usage purposes as applicable. -->
        </ul>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Data Sharing</h2>
        <p>
          We do not sell or share your personal data with third parties except as required to
          fulfil your order (e.g. shipping carriers, PayPal for payment processing) or as
          required by law.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Cookies</h2>
        <p>
          We use first-party cookies to maintain your session, remember your cart, and improve
          site performance. We do not use advertising or cross-site tracking cookies.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Data Retention</h2>
        <p>
          <!-- TODO: Specify your retention windows (orders, accounts, logs). -->
          Order records are retained for 7 years to comply with tax regulations. Account data
          is retained while your account is active and for 90 days after deletion.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Your Rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal data by
          contacting us at
          <!-- TODO: Replace with your support email. -->
          <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>.
          EU/UK residents have additional rights under GDPR including the right to data
          portability and to lodge a complaint with a supervisory authority.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Contact</h2>
        <p>
          For privacy questions, contact us at
          <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>.
        </p>
      </section>
    </div>
  </article>
</template>

<style scoped>
.info {
  max-width: 900px;
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
  margin: 0 0 24px;
  color: #0a0a0a;
}

.info-updated {
  font-size: 0.85rem;
  color: #888;
  margin: 0;
}

.info-body {
  max-width: 720px;
}

.info-section {
  margin-bottom: 48px;
}

.info-h2 {
  font-size: 0.8rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #888;
  font-weight: 500;
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.info-section p {
  font-size: 1rem;
  line-height: 1.75;
  color: #333;
  margin: 0 0 16px;
}

.info-section ul {
  padding-left: 20px;
  margin: 0 0 16px;
  color: #333;
  line-height: 1.75;
}

.info-section li {
  margin-bottom: 6px;
}

.info-section a {
  color: #0a0a0a;
  text-decoration: none;
  border-bottom: 1px solid #0a0a0a;
  padding-bottom: 1px;
}

@media (max-width: 600px) {
  .info {
    padding: 48px 24px;
  }

  .info-section {
    margin-bottom: 36px;
  }
}
</style>
