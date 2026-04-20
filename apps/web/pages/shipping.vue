<script setup lang="ts">
useSeoMeta({
  title: 'Shipping, Pre-Orders, Cancellations & Delivery - OVER REALM',
  description: 'Shipping times, pre-order handling, cancellation rules, and delivery support for international orders.',
})
</script>

<template>
  <article class="info">
    <header class="info-hero">
      <p class="info-eyebrow">Shipping</p>
      <h1 class="info-title">Pre-Orders, Cancellations &amp; Delivery</h1>
      <p class="info-lede">
        Clear rules for in-stock orders, pre-orders, shipping estimates, cancellations, and
        delivery support for international customers.
      </p>
    </header>

    <div class="info-body">
      <section class="info-section">
        <p class="info-intro">
          We sell globally and ship from our fulfillment network in mainland China. Shipping
          options, transit times, and customs handling vary by destination and by product type.
          The estimated shipping window shown on each product page is the best place to check
          how a specific item will be fulfilled.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Order Types</h2>
        <p>We label products in one of three ways:</p>
        <ul>
          <li><strong>In stock:</strong> ready to ship after payment review and packing</li>
          <li><strong>Pre-order:</strong> reserved now and shipped in a future estimated release window</li>
          <li><strong>Made to order:</strong> produced or allocated specifically after purchase</li>
        </ul>
        <p>
          Where an item is a pre-order or made-to-order product, the listing will display an
          <strong>estimated shipping window</strong> instead of a guaranteed dispatch date.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Processing &amp; Dispatch</h2>
        <p>
          In-stock orders usually leave our warehouse within <strong>2 to 5 business days</strong>
          after payment is confirmed. Orders may take longer during peak periods, stock
          transfers, product launches, holidays, address verification, or fraud screening.
        </p>
        <p>
          Orders containing multiple items may ship in one parcel or in split shipments,
          depending on availability, carton size, carrier restrictions, and destination.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Estimated Delivery Times</h2>
        <div class="rate-table">
          <div class="rate-row rate-row--head">
            <span>Region</span>
            <span>Transit Estimate</span>
            <span>Typical Carrier</span>
          </div>
          <div class="rate-row">
            <span>United States &amp; Canada</span>
            <span>7-14 business days</span>
            <span>DHL / FedEx</span>
          </div>
          <div class="rate-row">
            <span>EU &amp; UK</span>
            <span>7-16 business days</span>
            <span>DHL / EMS</span>
          </div>
          <div class="rate-row">
            <span>Japan, South Korea, Singapore</span>
            <span>5-10 business days</span>
            <span>EMS / DHL</span>
          </div>
          <div class="rate-row">
            <span>Australia &amp; New Zealand</span>
            <span>8-15 business days</span>
            <span>DHL</span>
          </div>
          <div class="rate-row">
            <span>Other destinations</span>
            <span>10-25 business days</span>
            <span>EMS / local partners</span>
          </div>
        </div>
        <p class="info-note">
          Delivery estimates exclude customs clearance, weather events, carrier backlogs, and
          other events outside our control.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Pre-Orders</h2>
        <p>
          Pre-orders reserve inventory from an upcoming production run. Release timing is set by
          the manufacturer and may move earlier or later than first announced.
        </p>
        <ul>
          <li>The product page shows the current estimated shipping window</li>
          <li>We may contact you before shipment to confirm final address details or balance due</li>
          <li>Pre-order and in-stock items may ship separately if that improves delivery speed</li>
          <li>If a manufacturer materially changes or cancels a release, we will contact affected customers directly</li>
        </ul>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Cancellations &amp; Address Changes</h2>
        <p>
          In-stock orders may usually be cancelled before they enter packing or dispatch.
          Pre-orders may be cancelled within <strong>24 hours</strong> for a full refund.
          After that point, we may retain a reasonable non-refundable reservation fee where
          production, allocation, or payment processing has already been committed.
        </p>
        <p>
          If you need to update your address, contact us as soon as possible. Once an order has
          been handed to the carrier, we cannot guarantee any reroute, interception, or recall.
        </p>
        <p class="info-note">
          Nothing in this policy limits any mandatory cancellation or refund rights that apply
          under the consumer laws of your country.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Taxes, Duties &amp; Customs</h2>
        <p>
          International orders may be subject to import duties, VAT, GST, brokerage fees, or
          other local charges. Unless we clearly state otherwise at checkout, those charges are
          the customer's responsibility.
        </p>
        <p>
          We declare shipments accurately and cannot undervalue goods or misdescribe contents on
          customs forms.
        </p>
      </section>

      <section class="info-section">
        <h2 class="info-h2">Tracking, Delivery Problems &amp; Returned Parcels</h2>
        <p>
          Tracking details are sent by email once the parcel is accepted by the carrier. If your
          tracking shows no movement for an unusual period, or the parcel appears lost, contact
          <a href="mailto:support@overrealm.shop">support@overrealm.shop</a> with your order
          number and tracking number.
        </p>
        <p>
          If a parcel is refused, abandoned, or returned because the address was incorrect,
          customs charges were not paid, or delivery attempts were missed, any refund may be
          reduced by the actual shipping, return, storage, customs, or carrier handling costs
          we incur.
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
  max-width: 620px;
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
