<script setup lang="ts">
const { items, count, subtotalCents, clearCart } = useCart();
const { isLoggedIn, customer } = useStorefrontAuth();
const router = useRouter();
const config = useRuntimeConfig();

// Redirect to cart if empty
if (import.meta.client && count.value === 0) {
  router.replace('/cart');
}

watch(count, (val) => {
  if (val === 0) router.replace('/cart');
});

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// Form state
const form = reactive({
  email: '',
  fullName: '',
  phone: '',
  country: 'US',
  stateOrProvince: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
});

const formError = ref('');
const isSubmitting = ref(false);
const paypalReady = ref(false);
const paypalContainerRef = ref<HTMLElement | null>(null);
const prefilled = ref(false);

const couponInput = ref('')
const appliedCoupon = ref<{ code: string; discountCents: number } | null>(null)
const couponError = ref('')
const applyingCoupon = ref(false)

async function applyCoupon() {
  couponError.value = ''
  applyingCoupon.value = true
  try {
    const { post } = usePublicApi()
    const result = await post<{ code: string; discountCents: number }>('/public/orders/validate-coupon', {
      code: couponInput.value.trim(),
      subtotalCents: subtotalCents.value,
    })
    appliedCoupon.value = result
  } catch (e: any) {
    couponError.value = e?.data?.message || 'Invalid coupon code'
  } finally {
    applyingCoupon.value = false
  }
}

function removeCoupon() {
  appliedCoupon.value = null
  couponInput.value = ''
  couponError.value = ''
}

// Prefill from logged-in customer profile + default address
async function prefillFromAccount() {
  if (!isLoggedIn.value || prefilled.value) return;
  prefilled.value = true;

  try {
    const { get } = usePublicApi();

    // Prefill email & name from customer profile
    if (customer.value) {
      form.email = customer.value.email || '';
      form.fullName = customer.value.name || '';
      form.phone = customer.value.phone || '';
    }

    // Prefill default address
    const addresses = await get<any[]>('/public/account/addresses');
    const defaultAddr = addresses?.find((a: any) => a.isDefault) || addresses?.[0];
    if (defaultAddr) {
      form.fullName = defaultAddr.fullName || form.fullName;
      form.phone = defaultAddr.phone || form.phone;
      form.country = defaultAddr.country || form.country;
      form.stateOrProvince = defaultAddr.stateOrProvince || '';
      form.city = defaultAddr.city || '';
      form.addressLine1 = defaultAddr.addressLine1 || '';
      form.addressLine2 = defaultAddr.addressLine2 || '';
      form.postalCode = defaultAddr.postalCode || '';
    }
  } catch {
    // Silent fail — user can fill manually
  }
}

onMounted(() => {
  if (import.meta.client) {
    prefillFromAccount();
  }
});

// Validate form before PayPal renders
function validateForm(): string | null {
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
  if (!form.fullName.trim()) return 'Please enter your full name.';
  if (!form.country.trim()) return 'Please select a country.';
  if (!form.city.trim()) return 'Please enter your city.';
  if (!form.addressLine1.trim()) return 'Please enter your address.';
  return null;
}

// Load PayPal SDK and render button
async function initPayPal() {
  const err = validateForm();
  if (err) {
    formError.value = err;
    return;
  }
  formError.value = '';

  if (paypalReady.value) return; // already initialized
  isSubmitting.value = true;

  const clientId = config.public.paypalClientId;
  if (!clientId) {
    formError.value = 'PayPal is not configured.';
    isSubmitting.value = false;
    return;
  }

  // Load PayPal JS SDK
  await new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[data-paypal-sdk]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.dataset.paypalSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(script);
  });

  isSubmitting.value = false;
  paypalReady.value = true;

  await nextTick();

  const apiBase = config.public.apiBase;

  // @ts-ignore
  window.paypal.Buttons({
    style: {
      layout: 'vertical',
      color: 'gold',
      shape: 'rect',
      label: 'paypal',
      height: 48,
    },
    async createOrder() {
      // Pre-check stock for all items before creating PayPal order
      for (const item of items.value) {
        const stockRes = await fetch(
          `${apiBase}/api/public/products/variants/${item.variantId}/stock`,
          { credentials: 'include' },
        );
        if (stockRes.ok) {
          const stockData = await stockRes.json();
          if (!stockData.available || stockData.stock < item.quantity) {
            throw new Error(`"${item.productName}" is no longer available in the requested quantity.`);
          }
        }
      }

      const res = await fetch(`${apiBase}/api/public/payments/paypal/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: items.value.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          currency: 'USD',
          couponCode: appliedCoupon.value?.code || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create PayPal order');
      }
      const data = await res.json();
      return data.paypalOrderId;
    },
    async onApprove(data: { orderID: string }) {
      isSubmitting.value = true;
      try {
        const res = await fetch(`${apiBase}/api/public/payments/paypal/capture-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            paypalOrderId: data.orderID,
            fullName: form.fullName,
            email: form.email,
            phone: form.phone || undefined,
            country: form.country,
            stateOrProvince: form.stateOrProvince || undefined,
            city: form.city,
            addressLine1: form.addressLine1,
            addressLine2: form.addressLine2 || undefined,
            postalCode: form.postalCode || undefined,
            currency: 'USD',
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || 'Payment capture failed');
        }
        const result = await res.json();
        clearCart();
        // For guests, include access token in URL
        if (result.guestAccessToken) {
          router.push(`/orders/${result.orderNo}?token=${result.guestAccessToken}`);
        } else {
          router.push(`/orders/${result.orderNo}`);
        }
      } catch (e: any) {
        formError.value = e.message || 'Payment failed. Please try again.';
        isSubmitting.value = false;
      }
    },
    onError(err: any) {
      formError.value = 'PayPal encountered an error. Please try again.';
      console.error('PayPal error', err);
    },
  }).render(paypalContainerRef.value);
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Checkout</h1>

    <div class="checkout-layout">
      <!-- Left: Form -->
      <div class="checkout-form">
        <!-- Contact -->
        <section class="form-section">
          <h2 class="section-title">Contact</h2>
          <ClientOnly>
            <p v-if="!isLoggedIn" class="auth-hint">
              Already have an account? <NuxtLink to="/login?redirect=/checkout">Sign in</NuxtLink>
            </p>
          </ClientOnly>
          <div class="field">
            <label class="field-label">Email address *</label>
            <input v-model="form.email" type="email" class="field-input" placeholder="you@example.com" autocomplete="email" />
          </div>
        </section>

        <!-- Delivery -->
        <section class="form-section">
          <h2 class="section-title">Delivery</h2>
          <div class="field">
            <label class="field-label">Full name *</label>
            <input v-model="form.fullName" type="text" class="field-input" placeholder="Jane Doe" autocomplete="name" />
          </div>
          <div class="field">
            <label class="field-label">Phone (optional)</label>
            <input v-model="form.phone" type="tel" class="field-input" placeholder="+1 555 000 0000" autocomplete="tel" />
          </div>
          <div class="field">
            <label class="field-label">Country *</label>
            <select v-model="form.country" class="field-input field-select">
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="CN">China</option>
              <option value="JP">Japan</option>
              <option value="KR">South Korea</option>
              <option value="SG">Singapore</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label">State / Province</label>
              <input v-model="form.stateOrProvince" type="text" class="field-input" placeholder="CA" autocomplete="address-level1" />
            </div>
            <div class="field">
              <label class="field-label">City *</label>
              <input v-model="form.city" type="text" class="field-input" placeholder="Los Angeles" autocomplete="address-level2" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Address *</label>
            <input v-model="form.addressLine1" type="text" class="field-input" placeholder="123 Main St" autocomplete="address-line1" />
          </div>
          <div class="field">
            <label class="field-label">Apartment, suite, etc.</label>
            <input v-model="form.addressLine2" type="text" class="field-input" placeholder="Apt 4B" autocomplete="address-line2" />
          </div>
          <div class="field field-half">
            <label class="field-label">Postal code</label>
            <input v-model="form.postalCode" type="text" class="field-input" placeholder="90210" autocomplete="postal-code" />
          </div>
        </section>

        <!-- Coupon -->
        <section class="form-section">
          <h2 class="section-title">Promo Code</h2>
          <div class="coupon-row">
            <input
              v-model="couponInput"
              type="text"
              class="coupon-input"
              placeholder="Enter promo code"
              :disabled="!!appliedCoupon"
            />
            <button
              v-if="!appliedCoupon"
              class="coupon-btn"
              :disabled="!couponInput.trim() || applyingCoupon"
              @click="applyCoupon"
            >
              {{ applyingCoupon ? '...' : 'Apply' }}
            </button>
            <button v-else class="coupon-remove" @click="removeCoupon">Remove</button>
          </div>
          <p v-if="couponError" class="coupon-error">{{ couponError }}</p>
          <p v-if="appliedCoupon" class="coupon-success">
            ✓ {{ appliedCoupon.code }} — saving ${{ (appliedCoupon.discountCents / 100).toFixed(2) }}
          </p>
        </section>

        <!-- Payment -->
        <section class="form-section">
          <h2 class="section-title">Payment</h2>

          <div v-if="!paypalReady" class="paypal-gate">
            <p class="paypal-gate-text">Review your details above, then click below to pay securely with PayPal.</p>
            <p v-if="formError" class="form-error">{{ formError }}</p>
            <button
              class="paypal-cta"
              :disabled="isSubmitting"
              @click="initPayPal"
            >
              <span v-if="isSubmitting">Loading PayPal…</span>
              <span v-else>Continue to PayPal</span>
            </button>
          </div>

          <div v-else>
            <p v-if="formError" class="form-error">{{ formError }}</p>
            <div ref="paypalContainerRef" class="paypal-container" />
          </div>
        </section>

        <div class="ssl-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Secure SSL checkout
        </div>
      </div>

      <!-- Right: Order Summary -->
      <div class="order-summary">
        <h2 class="summary-title">Order Summary</h2>

        <div class="summary-items">
          <div v-for="item in items" :key="item.variantId" class="summary-item">
            <div class="summary-item-img">
              <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.productName" />
              <div v-else class="summary-img-placeholder" />
              <span class="summary-qty-badge">{{ item.quantity }}</span>
            </div>
            <div class="summary-item-info">
              <p class="summary-item-brand">{{ item.brandName }}</p>
              <p class="summary-item-name">{{ item.productName }}</p>
              <p class="summary-item-variant">{{ item.variantName }}</p>
            </div>
            <div class="summary-item-price">
              {{ formatPrice(item.priceCents * item.quantity) }}
            </div>
          </div>
        </div>

        <div class="summary-divider" />

        <div class="summary-line">
          <span>Subtotal</span>
          <span>{{ formatPrice(subtotalCents) }}</span>
        </div>
        <div v-if="appliedCoupon" class="summary-line discount-line">
          <span>Discount ({{ appliedCoupon.code }})</span>
          <span>-{{ formatPrice(appliedCoupon.discountCents) }}</span>
        </div>
        <div class="summary-line">
          <span>Shipping</span>
          <span class="free-text">Free</span>
        </div>

        <div class="summary-divider" />

        <div class="summary-total">
          <span>Total</span>
          <span>{{ formatPrice(subtotalCents - (appliedCoupon?.discountCents ?? 0)) }}</span>
        </div>

        <NuxtLink to="/cart" class="edit-cart-link">Edit cart</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.checkout-layout {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 48px;
  align-items: start;
}

/* Form */
.checkout-form {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: #111;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 10px;
}

.auth-hint {
  font-size: 0.85rem;
  color: #555;
  margin: 0;
}

.auth-hint a {
  color: #111;
  font-weight: 600;
  text-decoration: underline;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #555;
}

.field-input {
  height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 12px;
  font-size: 0.9rem;
  color: #111;
  font-family: inherit;
  background: #fff;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.field-input:focus {
  outline: none;
  border-color: #111;
}

.field-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  cursor: pointer;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field-half {
  max-width: 200px;
}

/* PayPal gate */
.paypal-gate {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.paypal-gate-text {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
}

.form-error {
  font-size: 0.85rem;
  color: #b91c1c;
  margin: 0;
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

.paypal-cta {
  height: 48px;
  background: #ffc439;
  color: #111;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.paypal-cta:hover:not(:disabled) {
  background: #f0b429;
}

.paypal-cta:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.paypal-container {
  min-height: 48px;
}

.ssl-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #888;
}

/* Order Summary */
.order-summary {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 24px;
  position: sticky;
  top: 80px;
  background: #fafafa;
}

.summary-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 20px;
}

.summary-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-item-img {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: visible;
}

.summary-item-img img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.summary-img-placeholder {
  width: 56px;
  height: 56px;
  background: #e5e7eb;
  border-radius: 6px;
}

.summary-qty-badge {
  position: absolute;
  top: -7px;
  right: -7px;
  background: #555;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
}

.summary-item-info {
  flex: 1;
  min-width: 0;
}

.summary-item-brand {
  font-size: 0.7rem;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 1px;
}

.summary-item-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #111;
  margin: 0 0 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary-item-variant {
  font-size: 0.78rem;
  color: #777;
  margin: 0;
}

.summary-item-price {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
}

.summary-divider {
  border-top: 1px solid #e5e7eb;
  margin: 12px 0;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  color: #555;
  margin-bottom: 8px;
}

.free-text {
  color: #0f766e;
  font-weight: 500;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin-top: 4px;
}

.edit-cart-link {
  display: block;
  text-align: center;
  margin-top: 16px;
  font-size: 0.82rem;
  color: #888;
  text-decoration: none;
}

.edit-cart-link:hover {
  color: #111;
  text-decoration: underline;
}

.coupon-row { display: flex; gap: 8px; }
.coupon-input { flex: 1; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; }
.coupon-btn { padding: 10px 18px; background: #111; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
.coupon-btn:disabled { background: #ccc; cursor: not-allowed; }
.coupon-remove { padding: 10px 14px; background: none; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-size: 0.85rem; color: #666; }
.coupon-error { color: #dc2626; font-size: 0.8rem; margin: 6px 0 0; }
.coupon-success { color: #16a34a; font-size: 0.85rem; margin: 6px 0 0; font-weight: 500; }
.discount-line { color: #16a34a; }

@media (max-width: 900px) {
  .checkout-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .order-summary {
    position: static;
    order: -1;
  }
}

@media (max-width: 480px) {
  .field-row {
    grid-template-columns: 1fr;
  }

  .field-half {
    max-width: 100%;
  }
}
</style>
