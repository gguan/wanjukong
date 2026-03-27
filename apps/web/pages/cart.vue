<script setup lang="ts">
const { items, count, subtotalCents, removeFromCart, updateQuantity } = useCart();
const router = useRouter();
const mounted = ref(false);
onMounted(() => { mounted.value = true; });

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function goCheckout() {
  router.push('/checkout');
}
</script>

<template>
  <div class="page-container">
    <h1 class="page-title">Your Cart</h1>

    <template v-if="mounted">
    <!-- Empty state -->
    <div v-if="count === 0" class="empty-state">
      <p>Your cart is empty.</p>
      <NuxtLink to="/products" class="btn-browse">Browse Products</NuxtLink>
    </div>

    <!-- Cart content -->
    <div v-else class="cart-layout">
      <!-- Items -->
      <div class="cart-items">
        <div v-for="item in items" :key="item.variantId" class="cart-item">
          <div class="item-image">
            <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.productName" />
            <div v-else class="image-placeholder" />
          </div>
          <div class="item-info">
            <p class="item-brand">{{ item.brandName }}</p>
            <NuxtLink :to="`/products/${item.productSlug}`" class="item-name">
              {{ item.productName }}
            </NuxtLink>
            <p class="item-variant">{{ item.variantName }}</p>
            <p class="item-unit-price">{{ formatPrice(item.priceCents) }} each</p>
          </div>
          <div class="item-controls">
            <div class="qty-control">
              <button
                class="qty-btn"
                :disabled="item.quantity <= 1"
                @click="updateQuantity(item.variantId, item.quantity - 1)"
              >−</button>
              <span class="qty-value">{{ item.quantity }}</span>
              <button
                class="qty-btn"
                :disabled="item.quantity >= 10"
                @click="updateQuantity(item.variantId, item.quantity + 1)"
              >+</button>
            </div>
            <p class="item-total">{{ formatPrice(item.priceCents * item.quantity) }}</p>
            <button class="remove-btn" @click="removeFromCart(item.variantId)">Remove</button>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="cart-summary">
        <h2 class="summary-title">Order Summary</h2>
        <div class="summary-line">
          <span>Subtotal ({{ count }} item{{ count !== 1 ? 's' : '' }})</span>
          <span>{{ formatPrice(subtotalCents) }}</span>
        </div>
        <div class="summary-line">
          <span>Shipping</span>
          <span class="free-text">Free</span>
        </div>
        <div class="summary-divider" />
        <div class="summary-total">
          <span>Total</span>
          <span>{{ formatPrice(subtotalCents) }}</span>
        </div>
        <button class="checkout-btn" @click="goCheckout">
          Proceed to Checkout
        </button>
        <NuxtLink to="/products" class="continue-link">Continue Shopping</NuxtLink>
      </div>
    </div>
    </template>
  </div>
</template>

<style scoped>
.cart-layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 32px;
  align-items: start;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.cart-item {
  display: flex;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.cart-item:last-child {
  border-bottom: none;
}

.item-image {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-brand {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 2px;
}

.item-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111;
  text-decoration: none;
  display: block;
  margin-bottom: 2px;
}

.item-name:hover {
  text-decoration: underline;
}

.item-variant {
  font-size: 0.82rem;
  color: #666;
  margin: 0 0 4px;
}

.item-unit-price {
  font-size: 0.82rem;
  color: #888;
  margin: 0;
}

.item-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.qty-control {
  display: flex;
  align-items: center;
  gap: 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.qty-btn {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn:disabled {
  color: #ccc;
  cursor: not-allowed;
}

.qty-btn:hover:not(:disabled) {
  background: #f3f4f6;
}

.qty-value {
  min-width: 32px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 500;
  border-left: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-total {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.remove-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.remove-btn:hover {
  color: #b91c1c;
}

/* Summary */
.cart-summary {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 24px;
  position: sticky;
  top: 80px;
}

.summary-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 20px;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 10px;
}

.free-text {
  color: #0f766e;
  font-weight: 500;
}

.summary-divider {
  border-top: 1px solid #e5e7eb;
  margin: 12px 0;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: 700;
  color: #111;
  margin-bottom: 20px;
}

.checkout-btn {
  width: 100%;
  padding: 13px;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 12px;
  font-family: inherit;
}

.checkout-btn:hover {
  background: #333;
}

.continue-link {
  display: block;
  text-align: center;
  font-size: 0.85rem;
  color: #666;
  text-decoration: none;
}

.continue-link:hover {
  color: #111;
  text-decoration: underline;
}

/* Empty state */
.btn-browse {
  display: inline-block;
  margin-top: 16px;
  padding: 10px 24px;
  background: #111;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
}

.btn-browse:hover {
  background: #333;
}

@media (max-width: 768px) {
  .cart-layout {
    grid-template-columns: 1fr;
  }

  .cart-summary {
    position: static;
  }
}
</style>
