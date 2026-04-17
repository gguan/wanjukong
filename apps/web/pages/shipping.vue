<script setup lang="ts">
useSeoMeta({
  title: 'Shipping & Delivery — Over Realm',
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
        <p class="info-intro">
          We ship worldwide from our fulfilment centre in mainland China using DHL, FedEx, EMS
          or SF Express depending on destination. Shipping is free on every order — the rates
          below are for delivery-time reference only.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Processing Time</h2>
        <p>
          In-stock orders are picked, packed and handed to the carrier within
          <strong>3–5 business days</strong> of payment confirmation. Orders placed Friday
          evening through Sunday are processed the following Monday. During major holiday
          periods (Chinese New Year, Golden Week) expect 3–7 extra days.
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
            <span>Mainland China</span>
            <span>2–5 business days</span>
            <span>SF Express</span>
          </div>
          <div class="rate-row">
            <span>Hong Kong / Taiwan / Macau</span>
            <span>3–7 business days</span>
            <span>SF / EMS</span>
          </div>
          <div class="rate-row">
            <span>Japan / South Korea / Singapore</span>
            <span>5–10 business days</span>
            <span>EMS / DHL</span>
          </div>
          <div class="rate-row">
            <span>United States &amp; Canada</span>
            <span>7–14 business days</span>
            <span>DHL / FedEx</span>
          </div>
          <div class="rate-row">
            <span>Europe (EU / UK)</span>
            <span>10–18 business days</span>
            <span>DHL / EMS</span>
          </div>
          <div class="rate-row">
            <span>Australia &amp; New Zealand</span>
            <span>10–20 business days</span>
            <span>DHL</span>
          </div>
          <div class="rate-row">
            <span>Middle East / South America</span>
            <span>14–25 business days</span>
            <span>EMS</span>
          </div>
          <div class="rate-row">
            <span>Rest of World</span>
            <span>14–30 business days</span>
            <span>EMS</span>
          </div>
        </div>
        <p class="info-note">
          Delivery estimates are business days (Mon–Fri), exclude processing time, and exclude
          customs clearance time, which varies by destination. We are not liable for delays
          once the parcel leaves the warehouse.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Pre-Order Shipping</h2>
        <p>
          Pre-order items ship once the product arrives at our warehouse from the manufacturer.
          The estimated ship window is shown on each product page (e.g. "Ships Q3 2026") and
          is determined by the manufacturer's release schedule — it can and does shift.
        </p>
        <p>
          When a pre-order arrives, we email you a balance-due reminder. Once the balance is
          paid, the order ships within 3–5 business days. If the manufacturer delays the
          release by more than 90 days past the original window, we will notify you and you
          may cancel for a full refund of any amount paid.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Multi-Item Orders</h2>
        <p>
          When an order contains both an in-stock item and a pre-order item, we hold it and
          ship everything together once the pre-order arrives — unless you email us to split
          the shipment. Items purchased across separate orders cannot be combined after the
          fact.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Tracking</h2>
        <p>
          You will receive the tracking number by email the moment your parcel is handed to
          the carrier. You can also check status from your
          <NuxtLink to="/account/orders" class="inline-link">account orders page</NuxtLink>.
          Some destinations show "label created" status for up to 72 hours before the carrier
          scans the parcel in transit — this is normal.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Customs &amp; Duties</h2>
        <p>
          <!-- TODO: Confirm duties policy. -->
          Import duties, VAT or other taxes assessed by the destination country are the
          buyer's responsibility and are <strong>not</strong> included in the item price.
          Rates vary by country and by declared item value.
        </p>
        <p>
          By default we declare the full invoice value on the customs form. If you require
          any particular handling, email us before the order ships — we cannot falsify
          customs declarations.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Address Changes</h2>
        <p>
          You can change the shipping address from your account page as long as the order is
          still in <em>Processing</em> status. Once the parcel is handed to the carrier we
          can no longer redirect it — contact the carrier directly using the tracking number.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Delivery Issues</h2>
        <p>
          If tracking shows your parcel as delivered but you haven't received it: check with
          neighbours and your building's front desk, then contact the local carrier within 48
          hours. Carriers will not investigate claims filed after 7 days.
        </p>
        <p>
          If your parcel is marked <em>in transit</em> but hasn't moved for more than 14 days
          past the expected delivery window, email
          <a href="mailto:support@overrealm.shop">support@overrealm.shop</a> with your order
          number. We'll open a trace with the carrier and, if the parcel is declared lost,
          ship a replacement or issue a full refund.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Refused / Returned Parcels</h2>
        <p>
          If a parcel is refused at the destination or returned to us because the address was
          incorrect or nobody was home to accept repeated delivery attempts, we will issue a
          refund of the item price minus actual return-shipping costs charged by the carrier.
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

.info-intro {
  font-size: 1.05rem;
  color: #444;
  border-left: 2px solid #0a0a0a;
  padding-left: 20px;
  margin: 0 0 12px !important;
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
