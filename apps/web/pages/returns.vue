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
          <p class="summary-stat">24<span>hours</span></p>
          <p class="summary-label">Pre-order grace period</p>
        </div>
        <div class="summary-card">
          <p class="summary-stat">48<span>hours</span></p>
          <p class="summary-label">Damage-claim reporting window</p>
        </div>
        <div class="summary-card">
          <p class="summary-stat">5–10<span>days</span></p>
          <p class="summary-label">Refund processing time</p>
        </div>
      </div>

      <section class="info-section">
        <p class="info-intro">
          We stand behind every figure we ship. Returns cover the unusual — arrival damage,
          factory defects, items that differ materially from the listing. For the standard
          case of a correctly-delivered figure that no longer sparks joy, please read
          carefully before purchasing: collector items are generally final sale.
        </p>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════
           Arrival damage / defect
           ═══════════════════════════════════════════════════════════════ -->
      <section class="info-section">
        <h2 class="info-h2">Arrival Damage or Defect</h2>
        <p>
          Inspect your parcel within <strong>48 hours</strong> of delivery. If an item arrives
          damaged in transit, has factory defects (broken joint, missing accessory, paint
          errors), or is clearly different from the product listing, you are covered by our
          <strong>30-day manufacturer warranty</strong>.
        </p>
        <p>Email <a href="mailto:support@overrealm.shop">support@overrealm.shop</a> within 48 hours of delivery with:</p>
        <ul>
          <li>Your order number</li>
          <li>Clear photos of the outer parcel, the product packaging, and the defect</li>
          <li>A brief description of the issue</li>
        </ul>
        <p>
          Once we confirm the issue, you may choose a <strong>replacement, exchange, spare
          part, or full refund</strong>. We cover return shipping for confirmed damage
          claims. Claims filed after 48 hours may be reviewed but are not guaranteed.
        </p>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════
           Change-of-mind returns
           ═══════════════════════════════════════════════════════════════ -->
      <section class="info-section">
        <h2 class="info-h2">Change-of-Mind Returns</h2>
        <p>
          Unopened items in factory-sealed condition may be returned within
          <strong>14 days</strong> of delivery. The return window starts the day the parcel
          is marked delivered.
        </p>
        <p>Eligible:</p>
        <ul>
          <li>Unopened, unused, in original factory-sealed outer packaging</li>
          <li>Outer box free of damage, stickers, dents or writing</li>
          <li>All original materials included</li>
        </ul>
        <p>Not eligible:</p>
        <ul>
          <li>Opened, assembled, or displayed figures</li>
          <li>Items marked "Final Sale" or "Clearance"</li>
          <li>Pre-orders once the item has shipped from us</li>
          <li>Items damaged by the buyer after delivery</li>
          <li>Gift cards</li>
        </ul>
        <p>
          <strong>Return shipping is paid by the buyer</strong> for change-of-mind returns.
          We recommend a tracked, insured service — we are not responsible for returns lost
          in transit. A restocking fee of up to 15% may apply to items returned with damaged
          outer packaging.
        </p>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════
           Pre-order cancellation (matches our backend rules)
           ═══════════════════════════════════════════════════════════════ -->
      <section class="info-section">
        <h2 class="info-h2">Pre-Order Cancellation</h2>
        <p>
          Pre-orders follow a Sideshow-style two-phase payment: a deposit at checkout, and
          the balance before the item ships.
        </p>
        <ul>
          <li>
            <strong>Within 24 hours of deposit</strong> — cancel for a full refund of the
            deposit. Cancel yourself from
            <NuxtLink to="/account/orders" class="inline-link">your orders page</NuxtLink>
            or email us.
          </li>
          <li>
            <strong>After 24 hours, balance not yet paid</strong> — you may cancel at any
            time but the deposit is <strong>non-refundable</strong>. The unpaid balance is
            not charged and the item is released.
          </li>
          <li>
            <strong>After balance is paid but before shipping</strong> — contact us within
            48 hours; we may be able to cancel. Otherwise the order ships and the standard
            arrival-damage or change-of-mind policies apply.
          </li>
          <li>
            <strong>Manufacturer delay of 90+ days</strong> past the original estimated ship
            window — you may cancel for a full refund of everything paid, including the
            deposit.
          </li>
        </ul>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════
           Return process
           ═══════════════════════════════════════════════════════════════ -->
      <section class="info-section">
        <h2 class="info-h2">How to Return</h2>
        <ol class="step-list">
          <li>
            <span class="step-num">01</span>
            <div>
              <p class="step-title">Email us first</p>
              <p class="step-body">
                Do not ship anything before receiving approval. Send a message to
                <a href="mailto:support@overrealm.shop">support@overrealm.shop</a>
                with your order number, the item to return, reason, and photos if relevant.
              </p>
            </div>
          </li>
          <li>
            <span class="step-num">02</span>
            <div>
              <p class="step-title">Wait for approval</p>
              <p class="step-body">
                We review and reply within 2 business days with the return address and an
                RMA number. For approved damage claims, we provide a prepaid return label.
              </p>
            </div>
          </li>
          <li>
            <span class="step-num">03</span>
            <div>
              <p class="step-title">Pack and ship</p>
              <p class="step-body">
                Pack the item securely inside a shipping carton (never ship the retail box
                alone). Include the RMA number inside. Use a tracked, insured service and
                send us the tracking number.
              </p>
            </div>
          </li>
          <li>
            <span class="step-num">04</span>
            <div>
              <p class="step-title">Receive your refund</p>
              <p class="step-body">
                Once we receive and inspect the item, refunds are processed to the original
                payment method within <strong>5–10 business days</strong>. Bank settlement may
                take an additional 3–5 days depending on your card issuer.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════
           Refunds
           ═══════════════════════════════════════════════════════════════ -->
      <section class="info-section">
        <h2 class="info-h2">Refund Method &amp; Amount</h2>
        <p>
          Refunds are issued to the original payment method (PayPal for USD orders, WeChat
          Pay for CNY orders). We cannot refund to a different card, account or
          payment method.
        </p>
        <p>
          Refund amounts depend on the return reason:
        </p>
        <ul>
          <li><strong>Damage / defect:</strong> full item price, original shipping if applicable, and return shipping covered</li>
          <li><strong>Change of mind:</strong> item price only; return shipping paid by buyer; restocking fee may apply</li>
          <li><strong>Pre-order within grace period:</strong> full deposit refunded</li>
          <li><strong>Pre-order after grace period:</strong> balance not charged; deposit forfeited</li>
        </ul>
      </section>

      <!-- ═══════════════════════════════════════════════════════════════
           Final sale / exclusions
           ═══════════════════════════════════════════════════════════════ -->
      <section class="info-section">
        <h2 class="info-h2">Final Sale Items</h2>
        <p>
          Some items are marked <strong>Final Sale</strong> at listing time — typically
          clearance, limited-edition re-releases, and exhibition-exclusive figures. These are
          not eligible for change-of-mind returns. The arrival-damage policy still applies.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Not Our Responsibility</h2>
        <p>
          We can't help with:
        </p>
        <ul>
          <li>Items damaged by the buyer after delivery</li>
          <li>Items purchased from unauthorised resellers or outside our site</li>
          <li>Minor cosmetic variations between figures (paint application, assembly, stitching) — these are inherent to collectible manufacturing</li>
          <li>Price drops after purchase</li>
          <li>Delays or damage caused by the destination country's customs</li>
        </ul>
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
  grid-template-columns: repeat(4, 1fr);
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
