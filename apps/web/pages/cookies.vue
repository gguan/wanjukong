<script setup lang="ts">
useSeoMeta({
  title: 'Cookie Policy — OVER REALM',
  description: 'How OVER REALM uses cookies.',
})
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">Legal</p>
      <h1 class="info-title">Cookie Policy</h1>
      <p class="info-updated">
        <!-- TODO: Update this date when the policy changes. -->
        Last updated: 2026-04-18
      </p>
    </header>

    <div class="info-body">
      <section class="info-section">
        <p class="info-intro">
          This page explains the small number of cookies we use and why. We don't use
          advertising, retargeting or cross-site tracking cookies of any kind. If that
          changes, we will update this page and ask for your consent first.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">What Is a Cookie?</h2>
        <p>
          A cookie is a small text file stored on your device by the websites you visit.
          Cookies let a site remember things between page loads — whether you're signed in,
          what's in your cart, what language you picked.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Cookies We Use</h2>
        <div class="cookie-table">
          <div class="cookie-row cookie-row--head">
            <span>Name</span>
            <span>Purpose</span>
            <span>Duration</span>
          </div>
          <div class="cookie-row">
            <span class="code">connect.sid</span>
            <span>Keeps you signed in and remembers your cart between page loads.</span>
            <span>30 days</span>
          </div>
          <div class="cookie-row">
            <span class="code">wjk-lang</span>
            <span>Remembers your language preference (English / 简体中文 / 繁體中文 / 日本語).</span>
            <span>1 year</span>
          </div>
          <div class="cookie-row">
            <span class="code">wjk-cookie-consent</span>
            <span>Remembers that you've dismissed the cookie banner so we don't show it again.</span>
            <span>1 year</span>
          </div>
          <div class="cookie-row">
            <span class="code">wjk-cart</span>
            <span>
              Stored in localStorage (not technically a cookie): keeps your cart items even if
              you leave and come back later.
            </span>
            <span>Persistent</span>
          </div>
        </div>
        <p class="info-note">
          All cookies above are <strong>strictly necessary</strong> for the site to function
          as a store. They are not used for advertising or cross-site tracking.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Third-Party Cookies</h2>
        <p>
          When you pay via PayPal, the PayPal widget runs in an iframe loaded from
          <code>paypal.com</code> and may set its own cookies on that domain to complete the
          transaction. Those cookies are governed by
          <a href="https://www.paypal.com/legalhub/privacy-full" target="_blank" rel="noopener">PayPal's privacy policy</a>,
          not ours. We do not access or read them.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">How to Block Cookies</h2>
        <p>
          You can block or delete cookies in your browser settings at any time. If you block
          strictly-necessary cookies, cart and sign-in will stop working — you'll have to
          sign in on every page load and your cart will be empty.
        </p>
        <ul>
          <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
          <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
          <li><strong>Firefox:</strong> Preferences → Privacy &amp; Security</li>
          <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
        </ul>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Changes</h2>
        <p>
          If we ever add analytics, advertising or any non-essential cookie, we will ask for
          your opt-in consent through a visible banner before setting the cookie. You are
          free to decline and use the site without it.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Contact</h2>
        <p>
          Questions about cookies or privacy? Email us at
          <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>
          or see our <NuxtLink to="/privacy" class="inline-link">Privacy Policy</NuxtLink>.
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

.info-section code {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.85rem;
  background: #f5f5f5;
  padding: 1px 6px;
  border-radius: 3px;
}

.info-note {
  font-size: 0.85rem;
  color: #888;
  margin-top: 12px;
}

/* ─── Cookie table ─────────────────────────────── */
.cookie-table {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #eee;
}

.cookie-row {
  display: grid;
  grid-template-columns: 1.2fr 2.5fr 1fr;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
  color: #333;
  line-height: 1.55;
}

.cookie-row--head {
  font-size: 0.72rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #999;
  font-weight: 500;
  padding: 12px 0;
}

.cookie-row .code {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.82rem;
  color: #0a0a0a;
  word-break: break-all;
}

@media (max-width: 600px) {
  .info {
    padding: 48px 24px;
  }

  .info-section {
    margin-bottom: 36px;
  }

  .cookie-row {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 14px 0;
  }

  .cookie-row--head {
    display: none;
  }
}
</style>
