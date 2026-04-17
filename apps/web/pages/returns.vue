<script setup lang="ts">
useSeoMeta({
  title: 'Returns & Refunds — Wanjukong',
  description: 'Our return and refund policy for collectible figures.',
})
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">Returns</p>
      <h1 class="info-title">Returns & Refunds</h1>
      <p class="info-lede">
        <!-- TODO: Adjust return window and voice to match your policy. -->
        We stand behind every figure we ship. If something arrives wrong, let us know —
        we'll make it right.
      </p>
    </header>

    <div class="info-body">
      <!-- Quick summary cards -->
      <div class="summary-row">
        <div class="summary-card">
          <p class="summary-stat">14<span>days</span></p>
          <p class="summary-label">Return window from delivery</p>
        </div>
        <div class="summary-card">
          <p class="summary-stat">5–10<span>days</span></p>
          <p class="summary-label">Refund processing time</p>
        </div>
        <div class="summary-card">
          <p class="summary-stat">48<span>hrs</span></p>
          <p class="summary-label">Damage claim window</p>
        </div>
      </div>

      <section class="info-section">
        <h2 class="info-h2">Return Window</h2>
        <p>
          We accept returns within <strong>14 days</strong> of delivery for items in original,
          unopened condition. The return window starts the day your package is marked delivered.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Eligible for Return</h2>
        <ul>
          <li>Unopened items in original factory-sealed packaging</li>
          <li>Items received damaged or defective</li>
          <li>Items that significantly differ from the product description</li>
          <!-- TODO: Add/remove eligibility criteria. -->
        </ul>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Not Returnable</h2>
        <ul>
          <li>Opened, assembled, or displayed figures</li>
          <li>Items marked "Final Sale"</li>
          <li>Pre-order items after the manufacturer ship date has passed</li>
          <li>Items damaged by the buyer after delivery</li>
        </ul>
      </section>

      <section class="info-section">
        <h2 class="info-h2">How to Return</h2>
        <ol class="step-list">
          <li>
            <span class="step-num">01</span>
            <div>
              <p class="step-title">Email us</p>
              <p class="step-body">
                Send a message to
                <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>
                with your order number, the item you want to return, and the reason.
                Include photos if the item is damaged.
              </p>
            </div>
          </li>
          <li>
            <span class="step-num">02</span>
            <div>
              <p class="step-title">Wait for approval</p>
              <p class="step-body">
                We'll review and reply within 2 business days with return instructions and a
                prepaid return label (for approved damage claims) or the return address.
              </p>
            </div>
          </li>
          <li>
            <span class="step-num">03</span>
            <div>
              <p class="step-title">Ship it back</p>
              <p class="step-body">
                Pack the item securely in its original packaging and send it to the address
                we provide. Keep the tracking number.
              </p>
            </div>
          </li>
          <li>
            <span class="step-num">04</span>
            <div>
              <p class="step-title">Receive your refund</p>
              <p class="step-body">
                Once we receive and inspect the item, we'll process your refund within 5–10
                business days to the original payment method.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Pre-Order Cancellation</h2>
        <p>
          Pre-orders can be cancelled for a <strong>full refund within 24 hours</strong> of
          placing the order. After the 24-hour grace period, the deposit is non-refundable
          but the balance (if unpaid) is not charged. See our
          <NuxtLink to="/faq" class="inline-link">FAQ</NuxtLink>
          for details.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Shipping Costs</h2>
        <p>
          <!-- TODO: Confirm return shipping cost policy. -->
          Return shipping is paid by the buyer unless the item arrived damaged, defective, or
          was shipped in error — in which case we cover it.
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
  margin-bottom: 56px;
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

.info-body {
  max-width: 780px;
}

/* ─── Summary cards ──────────────────────────────── */
.summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 72px;
  padding: 32px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
}

.summary-card {
  /* no chrome */
}

.summary-stat {
  font-size: 2.4rem;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: #0a0a0a;
  margin: 0 0 4px;
  line-height: 1;
}

.summary-stat span {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #888;
  font-weight: 400;
  margin-left: 8px;
}

.summary-label {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

/* ─── Sections ──────────────────────────────── */
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

.info-section a,
.inline-link {
  color: #0a0a0a;
  text-decoration: none;
  border-bottom: 1px solid #0a0a0a;
  padding-bottom: 1px;
}

/* ─── Step list ──────────────────────────────── */
.step-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.step-list li {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 24px;
  align-items: start;
}

.step-num {
  font-size: 0.7rem;
  letter-spacing: 0.2em;
  color: #bbb;
  padding-top: 4px;
}

.step-title {
  font-size: 1rem;
  font-weight: 500;
  color: #0a0a0a;
  margin: 0 0 6px;
}

.step-body {
  font-size: 0.95rem;
  line-height: 1.65;
  color: #555;
  margin: 0;
}

@media (max-width: 600px) {
  .info {
    padding: 48px 24px;
  }

  .summary-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .info-section {
    margin-bottom: 36px;
  }

  .step-list li {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
