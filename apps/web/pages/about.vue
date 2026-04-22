<script setup lang="ts">
useSeoMeta({
  title: 'About — OVER REALM',
  description: 'Learn about OVER REALM, your destination for premium collectible figures.',
})
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">About</p>
      <h1 class="info-title">Curated collectibles,<br />handled with care.</h1>
      <p class="info-lede">
        <!-- TODO: Replace with your brand story — 1–2 sentences. -->
        OVER REALM is a dedicated online store for collectible action figure enthusiasts.
        We specialize in premium 1/6, 1/4, and 1/12 scale figures from the world's leading manufacturers.
      </p>
    </header>

    <div class="info-body">
      <section class="info-section">
        <h2 class="info-h2">Our Mission</h2>
        <p>
          We make it easy for collectors around the world to discover and purchase high-quality
          1/6, 1/4 and 1/12 scale collectible figures — from iconic movie characters to beloved
          anime heroes.
        </p>
        <p>
          <strong>OVER REALM is an independent retailer.</strong> We are not affiliated with,
          endorsed by, or officially connected to any figure brand or manufacturer. All
          trademarks, brand names, and product designs are the property of their respective
          owners and are used on this site solely to identify the items we sell.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">What We Stand For</h2>
        <div class="value-grid">
          <div class="value">
            <p class="value-num">01</p>
            <h3 class="value-title">Authentic</h3>
            <p class="value-body">
              Every item is sourced from reputable suppliers and authorized distributors.
              No bootlegs, no grey-market inventory.
            </p>
          </div>
          <div class="value">
            <p class="value-num">02</p>
            <h3 class="value-title">Curated</h3>
            <p class="value-body">
              <!-- TODO: Explain your curation philosophy. -->
              We hand-pick every figure in our catalogue. Quality over quantity — you won't see
              hundreds of generic listings here.
            </p>
          </div>
          <div class="value">
            <p class="value-num">03</p>
            <h3 class="value-title">Global</h3>
            <p class="value-body">
              <!-- TODO: Explain shipping/global reach. -->
              Free worldwide shipping. Trusted PayPal checkout. Customer support that responds
              in hours, not days.
            </p>
          </div>
        </div>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Story</h2>
        <p>
          Founded by a small team of lifelong collectors, OVER REALM started as a way to solve
          the frustrations we ourselves faced: confusing listings, opaque pre-order terms,
          and unreliable international shipping. We built the store we wanted to shop at.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Contact</h2>
        <p>
          Questions about an order, a product, or our shipping policy? Reach us at
          <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>, or use the
          <NuxtLink to="/contact">contact form</NuxtLink>. We aim to reply within one business day.
        </p>
      </section>

      <footer class="info-cta">
        <NuxtLink to="/products" class="cta-link">Browse the Collection →</NuxtLink>
      </footer>
    </div>
  </article>
</template>

<style scoped>
.info {
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px var(--site-gutter);
}

.info-hero {
  margin-bottom: 80px;
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
  max-width: 640px;
}

.info-body {
  max-width: 780px;
}

.info-section {
  margin-bottom: 72px;
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
  font-size: 1.05rem;
  line-height: 1.75;
  color: #333;
  margin: 0 0 18px;
}

.value-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
  margin-top: 32px;
}

.value-num {
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  color: #bbb;
  margin: 0 0 12px;
}

.value-title {
  font-size: 1.2rem;
  font-weight: 500;
  margin: 0 0 12px;
  color: #0a0a0a;
}

.value-body {
  font-size: 0.95rem;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

.info-cta {
  margin-top: 80px;
  padding-top: 40px;
  border-top: 1px solid #eee;
}

.cta-link {
  font-size: 0.85rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #0a0a0a;
  text-decoration: none;
  border-bottom: 1px solid #0a0a0a;
  padding-bottom: 4px;
  transition: opacity 0.2s;
}

.cta-link:hover {
  opacity: 0.6;
}

@media (max-width: 768px) {
  .info {
    padding: 48px 24px;
  }

  .info-hero {
    margin-bottom: 56px;
  }

  .info-section {
    margin-bottom: 48px;
  }

  .value-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
</style>
