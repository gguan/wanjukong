import { ref, computed, readonly } from 'vue';

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  productName: string;
  productSlug: string;
  brandName: string;
  variantName: string;
  priceCents: number;
  imageUrl: string | null;
}

const STORAGE_KEY = 'wjk-cart';

const _items = ref<CartItem[]>([]);
let _initialized = false;

function persist() {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_items.value));
  }
}

export function useCart() {
  // Load from localStorage once on first client-side call
  if (import.meta.client && !_initialized) {
    _initialized = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) _items.value = JSON.parse(saved);
    } catch {
      // ignore parse errors
    }
  }

  function addToCart(item: CartItem) {
    const existing = _items.value.find((i) => i.variantId === item.variantId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, 10);
    } else {
      _items.value.push({ ...item });
    }
    persist();
  }

  function removeFromCart(variantId: string) {
    _items.value = _items.value.filter((i) => i.variantId !== variantId);
    persist();
  }

  function updateQuantity(variantId: string, qty: number) {
    if (qty <= 0) {
      removeFromCart(variantId);
      return;
    }
    const item = _items.value.find((i) => i.variantId === variantId);
    if (item) {
      item.quantity = Math.min(qty, 10);
      persist();
    }
  }

  function clearCart() {
    _items.value = [];
    persist();
  }

  const count = computed(() =>
    _items.value.reduce((sum, i) => sum + i.quantity, 0),
  );

  const subtotalCents = computed(() =>
    _items.value.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
  );

  return {
    items: readonly(_items),
    count,
    subtotalCents,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}
