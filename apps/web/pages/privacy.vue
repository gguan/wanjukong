<script setup lang="ts">
useSeoMeta({
  title: 'Privacy Policy - OVER REALM',
  description: 'How OVER REALM collects, uses, shares, and protects customer data for international sales.',
})
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">Legal</p>
      <h1 class="info-title">Privacy Policy</h1>
      <p class="info-updated">Last updated: 2026-04-20</p>
    </header>

    <div class="info-body">
      <section class="info-section">
        <p class="info-intro">
          This Privacy Policy explains how we collect, use, store, and share personal
          information when you browse, contact us, create an account, or place an order with
          OVER REALM. Because we serve international customers, your information may be
          processed across borders as described below.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Information We Collect</h2>
        <ul>
          <li>Contact details such as name, email address, phone number, and delivery address</li>
          <li>Order details, payment status, refund history, and customer support messages</li>
          <li>Technical information such as IP address, browser type, device information, and site activity</li>
          <li>Preference data such as saved cart contents, language choice, and cookie settings</li>
        </ul>
        <p>
          Payment card details are handled by our payment providers. We receive only the
          limited payment metadata needed to confirm and support your transaction.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">How We Use Your Information</h2>
        <ul>
          <li>To operate the store and fulfill orders</li>
          <li>To provide customer service, shipping updates, and after-sales support</li>
          <li>To prevent fraud, abuse, and unauthorized transactions</li>
          <li>To keep records for tax, accounting, and legal compliance</li>
          <li>To improve site performance and understand how customers use the store</li>
          <li>To send marketing emails only where you have opted in or where permitted by law</li>
        </ul>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Data Sharing</h2>
        <p>
          We do not sell your personal information. We also do not rent or trade personal data
          to third parties for their own marketing.
        </p>
        <p>We share personal information only when needed to run the business, including with:</p>
        <ul>
          <li>Payment providers</li>
          <li>Shipping carriers, customs brokers, and logistics partners</li>
          <li>Hosting, email, analytics, fraud-prevention, and customer support providers</li>
          <li>Professional advisers or authorities where disclosure is required by law</li>
        </ul>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Cookies</h2>
        <p>
          We use essential cookies to keep the site functioning, remember your cart, maintain
          sign-in sessions, and store your privacy preferences. We may also use limited
          analytics tools to understand site performance.
        </p>
        <p>
          You can learn more in our <NuxtLink to="/cookies" class="inline-link">Cookie Policy</NuxtLink>.
          Blocking essential cookies may prevent checkout or account features from working.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">International Transfers</h2>
        <p>
          Our business operates internationally. Personal information may be processed in
          mainland China and in other countries where our service providers, logistics partners,
          or infrastructure providers operate. For international customers, this may mean your
          information is transferred across borders in order to fulfill your order and support
          your account.
        </p>
        <p>
          Where required by applicable law, we use contractual or organizational safeguards for
          cross-border transfers.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Retention &amp; Security</h2>
        <p>
          We keep information only for as long as reasonably necessary for the purposes
          described above, including legal, tax, accounting, fraud-prevention, and dispute
          handling requirements.
        </p>
        <p>
          We use reasonable administrative, technical, and physical safeguards to protect
          personal information. No online system can be guaranteed completely secure, but we
          work to limit access and reduce risk.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Your Rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, delete, or
          export your personal information, and to object to or restrict certain processing.
          You may also withdraw consent where processing relies on consent.
        </p>
        <p>
          To make a request, email
          <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>. We may need to
          verify your identity before completing the request.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Children</h2>
        <p>
          Our site and products are generally intended for collectors and adult purchasers. We
          do not knowingly collect personal information directly from children where prohibited
          by law. If you believe a child has provided personal data to us, contact us so we can
          review and delete it where appropriate.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Changes &amp; Contact</h2>
        <p>
          We may update this policy from time to time. When we do, we will post the revised
          version here and update the "Last updated" date above.
        </p>
        <p>
          For privacy questions, complaints, or data requests, contact
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
  padding: 80px var(--site-gutter);
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

.info-intro {
  font-size: 1.05rem;
  color: #444;
  border-left: 2px solid #0a0a0a;
  padding-left: 20px;
  margin: 0 0 12px !important;
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

@media (max-width: 600px) {
  .info {
    padding: 48px 24px;
  }

  .info-section {
    margin-bottom: 36px;
  }
}
</style>
