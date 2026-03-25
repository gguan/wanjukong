<script setup lang="ts">
import type { ProductVariant } from '~/composables/useProducts';

const route = useRoute();
const router = useRouter();
const slug = route.params.slug as string;
const variantIdFromQuery = (route.query.variant as string) || '';
const { fetchProductBySlug } = useProducts();
const { createBuyNowOrder } = useOrders();

const { data: product, status: loadStatus } = useAsyncData(
  `checkout-product-${slug}`,
  () => fetchProductBySlug(slug),
);

const selectedVariantId = ref(variantIdFromQuery);
const quantity = ref(1);
const submitting = ref(false);
const submitError = ref('');

// Auto-select default variant if none specified
watch(product, (p) => {
  if (!p?.variants?.length) return;
  if (!selectedVariantId.value) {
    const def = p.variants.find((v) => v.isDefault) || p.variants[0];
    selectedVariantId.value = def.id;
  }
});

const selectedVariant = computed<ProductVariant | null>(() => {
  if (!product.value?.variants?.length) return null;
  return (
    product.value.variants.find((v) => v.id === selectedVariantId.value) ||
    product.value.variants[0]
  );
});

const form = reactive({
  fullName: '',
  email: '',
  phone: '',
  country: 'US',
  stateOrProvince: '',
  city: '',
  addressLine1: '',
  addressLine2: '',
  postalCode: '',
});

const unitPrice = computed(() => {
  if (selectedVariant.value) return selectedVariant.value.priceCents / 100;
  if (!product.value) return 0;
  return typeof product.value.price === 'string'
    ? parseFloat(product.value.price)
    : product.value.price;
});

const subtotal = computed(() => unitPrice.value * quantity.value);
const total = computed(() => subtotal.value);

function formatPrice(val: number) {
  return `$${val.toFixed(2)}`;
}

async function handleSubmit() {
  if (!product.value) return;
  if (!selectedVariant.value) {
    submitError.value = 'Please select a variant';
    return;
  }
  submitError.value = '';
  submitting.value = true;

  try {
    const order = await createBuyNowOrder({
      productId: product.value.id,
      variantId: selectedVariant.value.id,
      quantity: quantity.value,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      country: form.country,
      stateOrProvince: form.stateOrProvince || undefined,
      city: form.city,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2 || undefined,
      postalCode: form.postalCode || undefined,
    });

    await router.push(`/orders/${order.orderNo}`);
  } catch (err: any) {
    submitError.value =
      err?.data?.message || err?.message || 'Failed to create order';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="page-container">
    <NuxtLink :to="`/products/${slug}`" class="back-link">&larr; Back to product</NuxtLink>

    <div v-if="loadStatus === 'pending'" class="loading-state">Loading...</div>

    <div v-else-if="!product" class="error-state">
      <h2>Product not found</h2>
      <NuxtLink to="/products">Browse products</NuxtLink>
    </div>

    <div v-else class="checkout-layout">
      <h1 class="page-title">Checkout</h1>

      <!-- Product summary -->
      <div class="product-summary">
        <div class="summary-image">
          <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" />
          <div v-else class="placeholder">No Image</div>
        </div>
        <div class="summary-info">
          <p class="summary-brand">{{ product.brand.name }}</p>
          <h3 class="summary-name">{{ product.name }}</h3>
          <p v-if="selectedVariant" class="summary-variant">{{ selectedVariant.name }}</p>
          <div class="summary-meta">
            <span v-if="product.category">{{ product.category.name }}</span>
            <span v-if="product.scale">{{ product.scale }}</span>
            <span v-if="selectedVariant">SKU: {{ selectedVariant.sku }}</span>
          </div>
          <p class="summary-price">{{ formatPrice(unitPrice) }}</p>
        </div>
      </div>

      <!-- Variant selector if multiple variants -->
      <fieldset v-if="product.variants && product.variants.length > 1" class="form-section">
        <legend>Select Edition</legend>
        <div class="variant-options">
          <label
            v-for="v in product.variants"
            :key="v.id"
            class="variant-option"
            :class="{ selected: v.id === selectedVariantId }"
          >
            <input
              v-model="selectedVariantId"
              type="radio"
              :value="v.id"
              name="variant"
              class="radio-hidden"
            />
            <span class="variant-option-name">{{ v.name }}</span>
            <span class="variant-option-price">${{ (v.priceCents / 100).toFixed(2) }}</span>
          </label>
        </div>
      </fieldset>

      <form class="checkout-form" @submit.prevent="handleSubmit">
        <!-- Quantity -->
        <fieldset class="form-section">
          <legend>Quantity</legend>
          <div class="form-row">
            <label>
              Qty
              <input v-model.number="quantity" type="number" min="1" max="10" required />
            </label>
          </div>
          <div class="price-line">
            <span>Subtotal</span>
            <span class="price-value">{{ formatPrice(subtotal) }}</span>
          </div>
          <div class="price-line total-line">
            <span>Total</span>
            <span class="price-value">{{ formatPrice(total) }}</span>
          </div>
        </fieldset>

        <!-- Contact -->
        <fieldset class="form-section">
          <legend>Contact Information</legend>
          <div class="form-row">
            <label>
              Full Name *
              <input v-model="form.fullName" type="text" required placeholder="John Doe" />
            </label>
          </div>
          <div class="form-row two-col">
            <label>
              Email *
              <input v-model="form.email" type="email" required placeholder="john@example.com" />
            </label>
            <label>
              Phone
              <input v-model="form.phone" type="tel" placeholder="Optional" />
            </label>
          </div>
        </fieldset>

        <!-- Shipping -->
        <fieldset class="form-section">
          <legend>Shipping Address</legend>
          <div class="form-row two-col">
            <label>
              Country *
              <input v-model="form.country" type="text" required placeholder="US" />
            </label>
            <label>
              State / Province
              <input v-model="form.stateOrProvince" type="text" placeholder="CA" />
            </label>
          </div>
          <div class="form-row two-col">
            <label>
              City *
              <input v-model="form.city" type="text" required placeholder="Los Angeles" />
            </label>
            <label>
              Postal Code
              <input v-model="form.postalCode" type="text" placeholder="90001" />
            </label>
          </div>
          <div class="form-row">
            <label>
              Address Line 1 *
              <input v-model="form.addressLine1" type="text" required placeholder="123 Main St" />
            </label>
          </div>
          <div class="form-row">
            <label>
              Address Line 2
              <input v-model="form.addressLine2" type="text" placeholder="Apt, Suite, etc." />
            </label>
          </div>
        </fieldset>

        <div v-if="submitError" class="form-error">{{ submitError }}</div>

        <button type="submit" class="submit-btn" :disabled="submitting">
          {{ submitting ? 'Placing Order...' : 'Place Order' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.checkout-layout { max-width: 640px; }

.product-summary { display: flex; gap: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px; }
.summary-image { width: 100px; height: 100px; flex-shrink: 0; border-radius: 6px; overflow: hidden; background: #fff; border: 1px solid #e5e7eb; }
.summary-image img { width: 100%; height: 100%; object-fit: cover; }
.placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 0.75rem; }
.summary-brand { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.04em; margin: 0 0 4px; }
.summary-name { font-size: 1rem; font-weight: 600; margin: 0 0 2px; }
.summary-variant { font-size: 0.85rem; color: #555; margin: 0 0 6px; }
.summary-meta { display: flex; gap: 8px; font-size: 0.75rem; color: #666; margin-bottom: 6px; }
.summary-price { font-size: 1.1rem; font-weight: 700; margin: 0; }

.variant-options { display: flex; gap: 8px; flex-wrap: wrap; }
.variant-option { display: flex; flex-direction: column; align-items: center; padding: 10px 16px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; min-width: 100px; }
.variant-option.selected { border-color: #111; background: #f9fafb; }
.variant-option:hover:not(.selected) { border-color: #d1d5db; }
.variant-option-name { font-size: 0.85rem; font-weight: 600; }
.variant-option-price { font-size: 0.75rem; color: #666; margin-top: 2px; }
.radio-hidden { display: none; }

.checkout-form { display: flex; flex-direction: column; gap: 20px; }
.form-section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 0; }
.form-section legend { font-weight: 600; font-size: 0.9rem; padding: 0 6px; }
.form-row { margin-bottom: 12px; }
.form-row:last-child { margin-bottom: 0; }
.form-row label { display: block; font-size: 0.8rem; color: #555; margin-bottom: 4px; }
.form-row input { display: block; width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; margin-top: 4px; }
.form-row input:focus { outline: none; border-color: #111; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.price-line { display: flex; justify-content: space-between; font-size: 0.9rem; padding: 4px 0; color: #555; }
.total-line { font-weight: 700; color: #111; font-size: 1rem; border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 4px; }
.price-value { font-variant-numeric: tabular-nums; }
.form-error { padding: 10px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #b91c1c; font-size: 0.85rem; }
.submit-btn { padding: 12px 24px; background: #111; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
.submit-btn:hover:not(:disabled) { background: #333; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.back-link { display: inline-block; margin-bottom: 24px; color: #666; text-decoration: none; font-size: 0.9rem; }
.back-link:hover { color: #111; }
</style>
