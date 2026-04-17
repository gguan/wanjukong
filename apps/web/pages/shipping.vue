<script setup lang="ts">
useSeoMeta({
  title: 'Shipping & Delivery — Wanjukong',
  description: 'Learn about our shipping options and delivery times.',
})
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">Shipping</p>
      <h1 class="info-title">Shipping & Delivery</h1>
      <p class="info-lede">
        <!-- TODO: Adjust claim and carrier list to match reality. -->
        Free worldwide shipping on every order. Tracked, insured, handled with care.
      </p>
    </header>

    <div class="info-body">
      <section class="info-section">
        <h2 class="info-h2">Processing Time</h2>
        <p>
          In-stock orders are processed and shipped within <strong>3–5 business days</strong>
          of payment confirmation. Orders placed over the weekend are processed the following
          Monday.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Delivery Times</h2>
        <div class="rate-table">
          <div class="rate-row rate-row--head">
            <span>Region</span>
            <span>Estimated Delivery</span>
            <span>Carrier</span>
          </div>
          <!-- TODO: Confirm carriers + delivery windows for each region. -->
          <div class="rate-row">
            <span>United States &amp; Canada</span>
            <span>7–14 business days</span>
            <span>DHL / FedEx</span>
          </div>
          <div class="rate-row">
            <span>Europe</span>
            <span>10–18 business days</span>
            <span>DHL / EMS</span>
          </div>
          <div class="rate-row">
            <span>Asia Pacific</span>
            <span>5–12 business days</span>
            <span>SF / EMS</span>
          </div>
          <div class="rate-row">
            <span>Australia &amp; New Zealand</span>
            <span>10–20 business days</span>
            <span>DHL</span>
          </div>
          <div class="rate-row">
            <span>Rest of World</span>
            <span>14–25 business days</span>
            <span>EMS</span>
          </div>
        </div>
        <p class="info-note">
          Delivery estimates exclude customs clearance time, which varies by country.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Pre-Order Shipping</h2>
        <p>
          Pre-order items ship once the product is received from the manufacturer. Estimated
          ship dates are shown on each product page and are subject to change based on
          manufacturer schedules. You will be notified of any material delay.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Customs &amp; Duties</h2>
        <p>
          <!-- TODO: Confirm duties policy. -->
          Import duties and taxes (if any) are the buyer's responsibility and are not included
          in the item price. Rates vary by destination country.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Tracking</h2>
        <p>
          You will receive a tracking number by email the moment your order ships. You can
          also view the status in your
          <NuxtLink to="/account/orders" class="inline-link">account orders page</NuxtLink>.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Lost or Delayed Packages</h2>
        <p>
          If your package hasn't arrived within the delivery window plus 5 business days,
          email us at
          <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>
          with your order number. We'll work with the carrier to locate it or issue a
          replacement.
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

.info-note {
  font-size: 0.85rem;
  color: #888;
  margin-top: 12px;
}

.info-section a,
.inline-link {
  color: #0a0a0a;
  text-decoration: none;
  border-bottom: 1px solid #0a0a0a;
  padding-bottom: 1px;
}

.rate-table {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #eee;
}

.rate-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
  font-size: 0.95rem;
  color: #333;
}

.rate-row--head {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #999;
  font-weight: 500;
  padding: 12px 0;
}

@media (max-width: 600px) {
  .info {
    padding: 48px 24px;
  }

  .info-section {
    margin-bottom: 36px;
  }

  .rate-row {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 14px 0;
  }

  .rate-row--head {
    display: none;
  }

  .rate-row span:first-child {
    font-weight: 500;
    color: #0a0a0a;
  }
}
</style>
