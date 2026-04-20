<script setup lang="ts">
import type { Order, Shipment } from '~/composables/useOrders';

const route = useRoute();
const orderNo = route.params.orderNo as string;
const token = (route.query.token as string) || undefined;
const { fetchOrderByNo } = useOrders();
const { isLoggedIn } = useStorefrontAuth();

const { data: order, error, status } = useAsyncData(
  `order-${orderNo}`,
  () => fetchOrderByNo(orderNo, token),
);

// ─── Formatting ─────────────────────────────────────────
function formatMoney(cents: number, currency = 'USD') {
  const symbol = currency === 'CNY' ? '¥' : '$';
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, opts ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── State derivation ───────────────────────────────────
/**
 * Collapse the order's (status, paymentStatus, isPreorder) triple into a
 * single "stage" the UI can branch on. Keeps the template flat.
 */
type Stage =
  | 'cancelled'
  | 'payment_failed'
  | 'refunded'
  | 'awaiting_payment'
  | 'balance_due'
  | 'awaiting_shipment'
  | 'shipped'
  | 'delivered';

const stage = computed<Stage>(() => {
  const o = order.value;
  if (!o) return 'awaiting_payment';
  if (o.status === 'CANCELLED') return 'cancelled';
  if (o.paymentStatus === 'REFUNDED') return 'refunded';
  if (o.paymentStatus === 'FAILED') return 'payment_failed';
  if (o.paymentStatus === 'UNPAID') return 'awaiting_payment';
  if (o.paymentStatus === 'DEPOSIT_PAID') return 'balance_due';
  if (o.status === 'DELIVERED') return 'delivered';
  if (o.status === 'SHIPPED') return 'shipped';
  return 'awaiting_shipment';
});

const stageTone = computed<'pending' | 'action' | 'good' | 'bad'>(() => {
  switch (stage.value) {
    case 'cancelled':
    case 'payment_failed':
    case 'refunded':
      return 'bad';
    case 'awaiting_payment':
    case 'balance_due':
      return 'action';
    case 'shipped':
    case 'delivered':
      return 'good';
    default:
      return 'pending';
  }
});

const heroTitle = computed(() => {
  switch (stage.value) {
    case 'cancelled':         return 'Order cancelled';
    case 'payment_failed':    return 'Payment failed';
    case 'refunded':          return 'Order refunded';
    case 'awaiting_payment':  return 'Awaiting payment';
    case 'balance_due':       return 'Deposit received — balance due';
    case 'awaiting_shipment': return order.value?.isPreorder ? 'Paid — awaiting release' : 'Paid — preparing to ship';
    case 'shipped':           return 'On its way';
    case 'delivered':         return 'Delivered';
  }
  return '';
});

const heroSub = computed(() => {
  const o = order.value;
  if (!o) return '';
  switch (stage.value) {
    case 'cancelled':
      return 'This order has been cancelled. Any deposit paid is being refunded.';
    case 'payment_failed':
      return 'We couldn\'t complete payment. Please try again or contact support.';
    case 'refunded':
      return 'We\'ve refunded this order in full.';
    case 'awaiting_payment':
      return 'We\'re holding your items while payment processes.';
    case 'balance_due':
      return o.balanceDueBy
        ? `Pay the remaining ${formatMoney(o.balanceCents, o.currency)} by ${formatDate(o.balanceDueBy)} to reserve your release.`
        : `We\'ll email you when the final ${formatMoney(o.balanceCents, o.currency)} balance is due — usually 2–4 weeks before the manufacturer ships.`;
    case 'awaiting_shipment':
      return o.isPreorder
        ? 'Fully paid. We\'ll ship as soon as stock arrives from the manufacturer.'
        : 'Fully paid. We\'re packing your order now.';
    case 'shipped':
      return primaryShipment.value?.estimatedDeliveryAt
        ? `Estimated delivery ${formatDate(primaryShipment.value.estimatedDeliveryAt)}. Tracking below.`
        : 'Your package is on the way. Tracking below.';
    case 'delivered':
      return primaryShipment.value?.deliveredAt
        ? `Delivered ${formatDate(primaryShipment.value.deliveredAt)}. We hope you love it.`
        : 'This order has been delivered. We hope you love it.';
  }
  return '';
});

// ─── Steps / progress tracker ───────────────────────────
interface Step { key: string; label: string; done: boolean; current: boolean }

const steps = computed<Step[]>(() => {
  const o = order.value;
  if (!o) return [];
  const s = stage.value;

  const terminalBad = s === 'cancelled' || s === 'payment_failed' || s === 'refunded';
  if (terminalBad) {
    // Show a minimal trail — just "Placed" and the terminal state
    return [
      { key: 'placed', label: 'Placed', done: true, current: false },
      {
        key: 'terminal',
        label: s === 'cancelled' ? 'Cancelled' : s === 'refunded' ? 'Refunded' : 'Failed',
        done: false,
        current: true,
      },
    ];
  }

  if (o.isPreorder) {
    return [
      { key: 'placed',    label: 'Placed',        done: true,                  current: false },
      { key: 'deposit',   label: 'Deposit paid',  done: !!o.depositPaidAt,     current: s === 'balance_due' },
      { key: 'balance',   label: 'Balance paid',  done: !!o.balancePaidAt,     current: s === 'awaiting_shipment' && !!o.balancePaidAt },
      { key: 'shipped',   label: 'Shipped',       done: s === 'shipped' || s === 'delivered', current: s === 'shipped' },
      { key: 'delivered', label: 'Delivered',     done: s === 'delivered',     current: s === 'delivered' },
    ];
  }

  return [
    { key: 'placed',    label: 'Placed',    done: true,                             current: false },
    { key: 'paid',      label: 'Paid',      done: s !== 'awaiting_payment',         current: s === 'awaiting_shipment' },
    { key: 'shipped',   label: 'Shipped',   done: s === 'shipped' || s === 'delivered', current: s === 'shipped' },
    { key: 'delivered', label: 'Delivered', done: s === 'delivered',                current: s === 'delivered' },
  ];
});

// ─── Shipments ──────────────────────────────────────────
const primaryShipment = computed<Shipment | null>(() => order.value?.shipments?.[0] ?? null);

const CARRIER_LABELS: Record<string, string> = {
  SF_EXPRESS: '顺丰速运',
  YTO: '圆通',
  ZTO: '中通',
  STO: '申通',
  YUNDA: '韵达',
  EMS: 'EMS',
  DHL: 'DHL',
  FEDEX: 'FedEx',
  UPS: 'UPS',
  OTHER: 'Courier',
};

function carrierLabel(s: Shipment) {
  if (s.carrier === 'OTHER' && s.carrierName) return s.carrierName;
  return CARRIER_LABELS[s.carrier] || s.carrier;
}

/**
 * Build a public carrier tracking URL where we know the path. No match =
 * no link (user can still copy the number).
 */
function trackingUrl(s: Shipment): string | null {
  const n = encodeURIComponent(s.trackingNumber);
  switch (s.carrier) {
    case 'DHL':        return `https://www.dhl.com/en/express/tracking.html?AWB=${n}`;
    case 'FEDEX':      return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case 'UPS':        return `https://www.ups.com/track?tracknum=${n}`;
    case 'EMS':        return `https://www.ems.com.cn/queryList?mailNum=${n}`;
    case 'SF_EXPRESS': return `https://www.sf-express.com/chn/sc/waybill/query/#search/bill-number/${n}`;
    case 'YTO':
    case 'ZTO':
    case 'STO':
    case 'YUNDA':      return `https://www.kuaidi100.com/chaxun?com=${s.carrier.toLowerCase()}&nu=${n}`;
    default:           return null;
  }
}

const shipmentStatusLabel: Record<string, string> = {
  PENDING: 'Preparing',
  SHIPPED: 'Shipped',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
};

const toast = ref('');
async function copyTracking(n: string) {
  try {
    await navigator.clipboard.writeText(n);
    toast.value = 'Tracking number copied';
    setTimeout(() => { toast.value = ''; }, 2000);
  } catch {
    toast.value = 'Copy failed — select and copy manually';
    setTimeout(() => { toast.value = ''; }, 2500);
  }
}

// ─── Totals ─────────────────────────────────────────────
const paidSoFarCents = computed(() => {
  const o = order.value;
  if (!o) return 0;
  if (o.paymentStatus === 'UNPAID') return 0;
  if (o.paymentStatus === 'DEPOSIT_PAID') return o.depositCents;
  return o.totalPriceCents;
});

const outstandingCents = computed(() => {
  const o = order.value;
  if (!o) return 0;
  return Math.max(0, o.totalPriceCents - paidSoFarCents.value);
});

// ─── Refund totals ─────────────────────────────────────
const refundedCents = computed(() =>
  (order.value?.refunds || [])
    .filter((r) => r.status === 'SUCCESS')
    .reduce((sum, r) => sum + r.amountCents, 0),
);

// ─── SEO ────────────────────────────────────────────────
useSeoMeta({
  title: computed(() => (order.value ? `Order ${order.value.orderNo} — OVER REALM` : 'Order — OVER REALM')),
  robots: 'noindex',
});
</script>

<template>
  <div class="page-container order-page">
    <div v-if="status === 'pending'" class="loading-state">Loading order...</div>

    <div v-else-if="error || !order" class="error-state">
      <h2>Order not found</h2>
      <p>We couldn't find an order with that number, or you don't have access to it.</p>
      <NuxtLink to="/products" class="error-link">Browse products →</NuxtLink>
    </div>

    <template v-else>
      <!-- ═══ HERO STATUS ═══ -->
      <section class="hero" :class="`hero--${stageTone}`">
        <div class="hero-main">
          <p class="hero-eyebrow">Order {{ order.orderNo }}</p>
          <h1 class="hero-title">{{ heroTitle }}</h1>
          <p class="hero-sub">{{ heroSub }}</p>
        </div>
      </section>

      <!-- ═══ PROGRESS TRACKER ═══ -->
      <section v-if="steps.length" class="progress">
        <ol class="progress-steps">
          <li
            v-for="(s, i) in steps"
            :key="s.key"
            class="progress-step"
            :class="{
              'progress-step--done': s.done,
              'progress-step--current': s.current,
              'progress-step--last': i === steps.length - 1,
            }"
          >
            <span class="progress-dot">
              <svg v-if="s.done" viewBox="0 0 12 12" width="12" height="12"><path d="M2.5 6.5 5 9l4.5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span v-else class="progress-dot-inner" />
            </span>
            <span class="progress-label">{{ s.label }}</span>
          </li>
        </ol>
      </section>

      <!-- ═══ LAYOUT: TWO COLUMNS ═══ -->
      <div class="order-layout">
        <!-- LEFT: details -->
        <div class="col-main">
          <!-- SHIPMENT CARD(S) -->
          <section v-if="order.shipments.length" class="card shipment-card">
            <header class="card-header">
              <h2 class="card-title">Shipment</h2>
              <span
                v-if="primaryShipment"
                class="shipment-status-pill"
                :class="`shipment-status-pill--${primaryShipment.status.toLowerCase()}`"
              >
                {{ shipmentStatusLabel[primaryShipment.status] || primaryShipment.status }}
              </span>
            </header>

            <div v-for="s in order.shipments" :key="s.id" class="shipment-row">
              <div class="shipment-meta">
                <span class="shipment-carrier">{{ carrierLabel(s) }}</span>
                <span v-if="s.isInternational" class="shipment-intl-badge">International</span>
              </div>
              <div class="shipment-tracking">
                <code class="shipment-number">{{ s.trackingNumber }}</code>
                <button type="button" class="link-btn" @click="copyTracking(s.trackingNumber)">Copy</button>
                <a v-if="trackingUrl(s)" :href="trackingUrl(s)!" target="_blank" rel="noopener" class="link-btn link-btn--primary">
                  Track →
                </a>
              </div>
              <dl class="shipment-dates">
                <div v-if="s.shippedAt">
                  <dt>Shipped</dt><dd>{{ formatDate(s.shippedAt) }}</dd>
                </div>
                <div v-if="s.estimatedDeliveryAt">
                  <dt>Est. delivery</dt><dd>{{ formatDate(s.estimatedDeliveryAt) }}</dd>
                </div>
                <div v-if="s.deliveredAt">
                  <dt>Delivered</dt><dd>{{ formatDate(s.deliveredAt) }}</dd>
                </div>
              </dl>
            </div>
          </section>

          <!-- ITEMS -->
          <section class="card items-card">
            <header class="card-header">
              <h2 class="card-title">Items ({{ order.items.reduce((n, i) => n + i.quantity, 0) }})</h2>
            </header>

            <ul class="items-list">
              <li v-for="item in order.items" :key="item.id" class="item-row">
                <div class="item-image">
                  <img v-if="item.coverImageUrlSnapshot" :src="item.coverImageUrlSnapshot" :alt="item.productNameSnapshot" />
                  <div v-else class="placeholder">No image</div>
                  <span v-if="item.isPreorder" class="item-preorder-badge">Preorder</span>
                </div>
                <div class="item-info">
                  <p v-if="item.brandNameSnapshot" class="item-brand">{{ item.brandNameSnapshot }}</p>
                  <p class="item-name">{{ item.productNameSnapshot }}</p>
                  <p v-if="item.variantNameSnapshot" class="item-variant">{{ item.variantNameSnapshot }}</p>
                  <div class="item-meta">
                    <span v-if="item.skuSnapshot">SKU: {{ item.skuSnapshot }}</span>
                    <span v-if="item.scaleSnapshot">{{ item.scaleSnapshot }}</span>
                  </div>
                </div>
                <div class="item-pricing">
                  <p class="item-total">{{ formatMoney(item.totalPriceCents, order.currency) }}</p>
                  <p class="item-unit">{{ formatMoney(item.unitPriceCents, order.currency) }} × {{ item.quantity }}</p>
                  <p v-if="item.isPreorder && item.depositCents > 0" class="item-deposit">
                    Deposit {{ formatMoney(item.depositCents, order.currency) }}
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <!-- REFUNDS -->
          <section v-if="order.refunds.length" class="card refunds-card">
            <header class="card-header">
              <h2 class="card-title">Refunds</h2>
            </header>
            <ul class="refunds-list">
              <li v-for="r in order.refunds" :key="r.id" class="refund-row">
                <div>
                  <span class="refund-amount">−{{ formatMoney(r.amountCents, order.currency) }}</span>
                  <span class="refund-status" :class="`refund-status--${r.status.toLowerCase()}`">{{ r.status }}</span>
                </div>
                <div class="refund-meta">
                  <span v-if="r.reason">{{ r.reason }} · </span>
                  <span>{{ formatDate(r.processedAt || r.createdAt) }}</span>
                </div>
              </li>
            </ul>
          </section>

          <!-- SHIPPING ADDRESS -->
          <section class="card">
            <header class="card-header">
              <h2 class="card-title">Shipping address</h2>
            </header>
            <address class="address">
              <p>{{ order.fullName }}</p>
              <p>{{ order.addressLine1 }}</p>
              <p v-if="order.addressLine2">{{ order.addressLine2 }}</p>
              <p>
                {{ order.city }}<span v-if="order.stateOrProvince">, {{ order.stateOrProvince }}</span>
                <span v-if="order.postalCode"> {{ order.postalCode }}</span>
              </p>
              <p>{{ order.country }}</p>
              <p v-if="order.phone" class="address-phone">{{ order.phone }}</p>
            </address>
          </section>

          <!-- CONTACT -->
          <section class="card">
            <header class="card-header">
              <h2 class="card-title">Contact</h2>
            </header>
            <p class="contact-email">{{ order.email }}</p>
            <p class="contact-note">We've emailed your receipt and tracking updates to this address.</p>
          </section>
        </div>

        <!-- RIGHT: summary rail -->
        <aside class="col-rail">
          <section class="card summary-card">
            <header class="card-header">
              <h2 class="card-title">Summary</h2>
            </header>

            <dl class="summary-lines">
              <div class="summary-row">
                <dt>Subtotal</dt>
                <dd>{{ formatMoney(order.subtotalPriceCents, order.currency) }}</dd>
              </div>
              <div v-if="order.discountCents > 0" class="summary-row summary-row--discount">
                <dt>Discount <span v-if="order.couponCode">({{ order.couponCode }})</span></dt>
                <dd>−{{ formatMoney(order.discountCents, order.currency) }}</dd>
              </div>
              <div class="summary-row">
                <dt>Shipping</dt>
                <dd class="summary-free">Free</dd>
              </div>
              <div class="summary-row summary-row--total">
                <dt>Total</dt>
                <dd>{{ formatMoney(order.totalPriceCents, order.currency) }}</dd>
              </div>
            </dl>

            <!-- Preorder payment breakdown -->
            <div v-if="order.isPreorder" class="preorder-split">
              <div class="preorder-row">
                <span>Deposit</span>
                <span :class="{ 'preorder-paid': !!order.depositPaidAt }">
                  {{ formatMoney(order.depositCents, order.currency) }}
                  <em v-if="order.depositPaidAt">paid {{ formatDate(order.depositPaidAt) }}</em>
                </span>
              </div>
              <div class="preorder-row">
                <span>Balance</span>
                <span :class="{ 'preorder-paid': !!order.balancePaidAt }">
                  {{ formatMoney(order.balanceCents, order.currency) }}
                  <em v-if="order.balancePaidAt">paid {{ formatDate(order.balancePaidAt) }}</em>
                  <em v-else-if="order.balanceDueBy">due {{ formatDate(order.balanceDueBy) }}</em>
                </span>
              </div>
            </div>

            <!-- Outstanding callout -->
            <div v-if="stage === 'balance_due' && outstandingCents > 0" class="outstanding">
              <p class="outstanding-label">Balance due</p>
              <p class="outstanding-amount">{{ formatMoney(outstandingCents, order.currency) }}</p>
              <p class="outstanding-hint">We'll email you when it's time to pay — usually shortly before release.</p>
            </div>

            <!-- Refund callout -->
            <div v-if="refundedCents > 0" class="summary-row summary-row--refund">
              <dt>Refunded</dt>
              <dd>−{{ formatMoney(refundedCents, order.currency) }}</dd>
            </div>

            <div class="summary-meta">
              <div><span>Placed</span><span>{{ formatDateTime(order.createdAt) }}</span></div>
              <div><span>Currency</span><span>{{ order.currency }}</span></div>
            </div>
          </section>

          <div class="rail-actions">
            <NuxtLink to="/products" class="action-link action-link--ghost">Continue shopping</NuxtLink>
            <ClientOnly>
              <NuxtLink v-if="isLoggedIn" to="/account/orders" class="action-link">View order history →</NuxtLink>
            </ClientOnly>
          </div>
        </aside>
      </div>

      <Transition name="toast">
        <div v-if="toast" class="toast">{{ toast }}</div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.order-page {
  max-width: 1040px;
  margin: 0 auto;
}

.loading-state,
.error-state {
  padding: 48px 16px;
  text-align: center;
  color: #555;
}

.error-state h2 {
  font-size: 1.25rem;
  margin: 0 0 6px;
  color: #111;
}

.error-link {
  display: inline-block;
  margin-top: 12px;
  color: #111;
  text-decoration: none;
  font-weight: 500;
}

.error-link:hover {
  text-decoration: underline;
}

/* ═══ HERO ═══ */
.hero {
  border-radius: 12px;
  padding: 28px 28px;
  margin: 8px 0 24px;
  border: 1px solid;
}

.hero-eyebrow {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  margin: 0 0 6px;
  opacity: 0.7;
}

.hero-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 8px;
  line-height: 1.15;
}

.hero-sub {
  font-size: 0.92rem;
  margin: 0;
  line-height: 1.5;
  max-width: 56ch;
}

.hero--pending { background: #f6f6f7; border-color: #e5e7eb; color: #1a1a1a; }
.hero--action  { background: #fef5e7; border-color: #f3d9a4; color: #5b3a10; }
.hero--good    { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
.hero--bad     { background: #fef2f2; border-color: #fecaca; color: #7f1d1d; }

/* ═══ PROGRESS TRACKER ═══ */
.progress {
  margin-bottom: 24px;
}

.progress-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 0;
}

.progress-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  position: relative;
  color: #9ca3af;
}

.progress-step--done { color: #065f46; }
.progress-step--current { color: #111; }

.progress-step:not(.progress-step--last)::after {
  content: '';
  position: absolute;
  top: 9px;
  left: 24px;
  right: 12px;
  height: 2px;
  background: currentColor;
  opacity: 0.25;
}

.progress-step--done:not(.progress-step--last)::after {
  opacity: 1;
  background: #065f46;
}

.progress-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid currentColor;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.progress-step--done .progress-dot { background: #065f46; border-color: #065f46; color: #fff; }
.progress-step--current .progress-dot { border-color: #111; }
.progress-step--current .progress-dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #111;
}

.progress-label {
  font-size: 0.8rem;
  font-weight: 500;
}

/* ═══ LAYOUT ═══ */
.order-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;
  align-items: start;
}

.col-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.col-rail {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 88px;
}

/* ═══ CARDS ═══ */
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
  color: #111;
}

/* ═══ SHIPMENT ═══ */
.shipment-status-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.shipment-status-pill--pending     { background: #fef3c7; color: #92400e; }
.shipment-status-pill--shipped,
.shipment-status-pill--in_transit  { background: #dbeafe; color: #1e40af; }
.shipment-status-pill--delivered   { background: #d1fae5; color: #065f46; }
.shipment-status-pill--returned    { background: #fee2e2; color: #991b1b; }

.shipment-row {
  padding: 12px 0;
  border-top: 1px solid #f3f4f6;
}
.shipment-row:first-of-type { border-top: none; padding-top: 0; }

.shipment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.shipment-carrier {
  font-weight: 600;
  color: #111;
  font-size: 0.9rem;
}

.shipment-intl-badge {
  font-size: 0.65rem;
  padding: 2px 8px;
  background: #eef2ff;
  color: #3730a3;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.shipment-tracking {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.shipment-number {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.88rem;
  color: #111;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.link-btn {
  background: none;
  border: none;
  font-family: inherit;
  font-size: 0.82rem;
  color: #555;
  cursor: pointer;
  padding: 4px 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.link-btn:hover { color: #111; }
.link-btn--primary { color: #111; font-weight: 500; }

.shipment-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin: 0;
  font-size: 0.82rem;
}

.shipment-dates dt {
  color: #888;
  margin-right: 6px;
  display: inline;
}

.shipment-dates dd {
  margin: 0;
  display: inline;
  color: #111;
  font-weight: 500;
}

.shipment-dates > div {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ═══ ITEMS ═══ */
.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.item-row {
  display: grid;
  grid-template-columns: 72px 1fr auto;
  gap: 14px;
  align-items: start;
}

.item-image {
  width: 72px;
  height: 72px;
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  font-size: 0.65rem;
}

.item-preorder-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(146, 64, 14, 0.92);
  color: #fff;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 600;
}

.item-info {
  min-width: 0;
}

.item-brand {
  font-size: 0.7rem;
  color: #888;
  text-transform: uppercase;
  margin: 0 0 2px;
  letter-spacing: 0.04em;
}

.item-name {
  font-size: 0.92rem;
  font-weight: 600;
  margin: 0 0 2px;
  color: #111;
  line-height: 1.3;
}

.item-variant {
  font-size: 0.8rem;
  color: #555;
  margin: 0 0 4px;
}

.item-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: #888;
}

.item-pricing {
  text-align: right;
  flex-shrink: 0;
}

.item-total {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  color: #111;
}

.item-unit {
  font-size: 0.72rem;
  color: #888;
  margin: 2px 0 0;
}

.item-deposit {
  font-size: 0.7rem;
  color: #92400e;
  margin: 4px 0 0;
  font-weight: 500;
}

/* ═══ REFUNDS ═══ */
.refunds-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.refund-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #f3f4f6;
  flex-wrap: wrap;
  gap: 4px;
}
.refund-row:first-child { border-top: none; }

.refund-amount {
  font-weight: 600;
  color: #111;
  margin-right: 10px;
}

.refund-status {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 3px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.refund-status--success { background: #d1fae5; color: #065f46; }
.refund-status--pending { background: #fef3c7; color: #92400e; }
.refund-status--failed  { background: #fee2e2; color: #991b1b; }

.refund-meta {
  font-size: 0.8rem;
  color: #666;
}

/* ═══ ADDRESS + CONTACT ═══ */
.address {
  font-style: normal;
  color: #333;
  font-size: 0.9rem;
  line-height: 1.5;
}

.address p {
  margin: 0;
}

.address-phone {
  margin-top: 4px;
  color: #555;
  font-size: 0.85rem;
}

.contact-email {
  font-size: 0.95rem;
  margin: 0 0 4px;
  color: #111;
  font-weight: 500;
}

.contact-note {
  font-size: 0.8rem;
  color: #888;
  margin: 0;
}

/* ═══ SUMMARY RAIL ═══ */
.summary-card { background: #fafafa; }

.summary-lines {
  margin: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 0.88rem;
  color: #444;
}

.summary-row dt { margin: 0; }
.summary-row dd { margin: 0; }

.summary-row--discount { color: #0f766e; }

.summary-free { color: #0f766e; font-weight: 500; }

.summary-row--total {
  border-top: 1px solid #e5e7eb;
  margin-top: 4px;
  padding-top: 10px;
  font-size: 1rem;
  font-weight: 700;
  color: #111;
}

.summary-row--refund {
  color: #991b1b;
  border-top: 1px solid #e5e7eb;
  margin-top: 4px;
  padding-top: 10px;
}

.preorder-split {
  margin-top: 12px;
  padding: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85rem;
}

.preorder-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.preorder-row em {
  font-style: normal;
  color: #0f766e;
  font-size: 0.72rem;
  margin-left: 6px;
}

.preorder-paid {
  color: #0f766e;
  font-weight: 600;
}

.outstanding {
  margin-top: 12px;
  padding: 14px;
  background: #fef5e7;
  border: 1px solid #f3d9a4;
  border-radius: 8px;
}

.outstanding-label {
  font-size: 0.78rem;
  margin: 0 0 2px;
  color: #92400e;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.outstanding-amount {
  font-size: 1.25rem;
  font-weight: 700;
  color: #5b3a10;
  margin: 0 0 6px;
}

.outstanding-hint {
  font-size: 0.78rem;
  color: #92400e;
  margin: 0;
  line-height: 1.4;
}

.summary-meta {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.78rem;
  color: #888;
}

.summary-meta > div {
  display: flex;
  justify-content: space-between;
}

.rail-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 4px;
}

.action-link {
  font-size: 0.88rem;
  color: #111;
  text-decoration: none;
  font-weight: 500;
}

.action-link--ghost {
  color: #666;
  font-weight: 400;
}

.action-link:hover { text-decoration: underline; }

/* ═══ TOAST ═══ */
.toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: #111;
  color: #fff;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 0.88rem;
  z-index: 1000;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.2s ease;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 900px) {
  .order-layout {
    grid-template-columns: 1fr;
  }

  .col-rail {
    position: static;
  }

  .progress-steps {
    overflow-x: auto;
    padding-bottom: 6px;
  }

  .progress-step {
    min-width: 90px;
  }
}

@media (max-width: 480px) {
  .hero { padding: 22px 18px; }
  .hero-title { font-size: 1.3rem; }
  .card { padding: 16px; }
  .item-row { grid-template-columns: 56px 1fr; }
  .item-image { width: 56px; height: 56px; }
  .item-pricing {
    grid-column: 1 / -1;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-top: 4px;
  }
  .item-unit, .item-deposit { margin: 0; }
}
</style>
