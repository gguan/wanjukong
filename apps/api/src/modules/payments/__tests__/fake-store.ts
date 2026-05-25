/**
 * In-memory Prisma double used by the payment / order E2E specs.
 *
 * Only the operations actually exercised by OrdersService + PaymentsService
 * are implemented. The fake intentionally mirrors Prisma's semantics for
 * `updateMany` (returns `{ count }`), nested `create.items.create`,
 * `$transaction(callback)` (callback receives the same handle so writes
 * are visible mid-flow), and `$queryRaw` (SELECT ... FOR UPDATE) — those
 * are the corners the production code relies on.
 *
 * Anything not used here throws so we notice when a flow grows.
 */

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}_${idCounter}`;
}

export interface VariantSeed {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceCents: number;
  usdPriceCents?: number | null;
  stock: number;
  coverImageUrl?: string | null;
}

export interface ProductSeed {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'DRAFT' | 'INACTIVE' | 'PENDING_REVIEW';
  saleType: 'IN_STOCK' | 'PREORDER';
  imageUrl?: string | null;
  scale?: string | null;
  brandId?: string;
  categoryId?: string;
  preorderStartAt?: Date | null;
  preorderEndAt?: Date | null;
  depositCents?: number | null;
  usdDepositCents?: number | null;
}

export interface CustomerSeed {
  id: string;
  email: string;
  name?: string;
  phone?: string | null;
  wechatOpenId?: string | null;
}

export interface CouponSeed {
  id?: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderCents?: number;
  maxUsageTimes?: number | null;
  usedCount?: number;
  isActive?: boolean;
  expiresAt?: Date | null;
}

export class FakeStore {
  products = new Map<string, any>();
  variants = new Map<string, any>();
  customers = new Map<string, any>();
  customerAddresses = new Map<string, any>();
  coupons = new Map<string, any>();
  orders = new Map<string, any>();
  orderItems = new Map<string, any>();
  paymentIntents = new Map<string, any>();
  refunds = new Map<string, any>();
  shipments = new Map<string, any>();

  seedProduct(p: ProductSeed) {
    const full = {
      brand: { id: p.brandId ?? 'brand_1', name: 'Acme' },
      category: { id: p.categoryId ?? 'cat_1', name: 'Figures' },
      preorderStartAt: null,
      preorderEndAt: null,
      depositCents: null,
      usdDepositCents: null,
      imageUrl: null,
      scale: '1/6',
      ...p,
    };
    this.products.set(p.id, full);
    return full;
  }

  seedVariant(v: VariantSeed) {
    const product = this.products.get(v.productId);
    const full = {
      usdPriceCents: null,
      coverImageUrl: null,
      ...v,
      product,
    };
    this.variants.set(v.id, full);
    return full;
  }

  seedCustomer(c: CustomerSeed) {
    const full = { wechatOpenId: null, phone: null, ...c };
    this.customers.set(c.id, full);
    return full;
  }

  seedCoupon(c: CouponSeed) {
    const full = {
      id: c.id ?? nextId('cpn'),
      minOrderCents: 0,
      maxUsageTimes: null,
      usedCount: 0,
      isActive: true,
      expiresAt: null,
      ...c,
      code: c.code.toUpperCase(),
    };
    this.coupons.set(full.code, full);
    return full;
  }

  seedCustomerAddress(a: {
    id: string;
    customerId: string;
    fullName: string;
    phone?: string;
    country: string;
    city: string;
    addressLine1: string;
    postalCode?: string;
    stateOrProvince?: string;
    addressLine2?: string;
    district?: string;
  }) {
    const full = {
      stateOrProvince: null,
      district: null,
      addressLine2: null,
      postalCode: null,
      phone: null,
      ...a,
    };
    this.customerAddresses.set(a.id, full);
    return full;
  }
}

/** Build a Prisma-shaped handle backed by `store`. */
export function buildPrismaHandle(store: FakeStore): any {
  const handle: any = {
    product: {
      findUnique: async ({ where }: any) => store.products.get(where.id) ?? null,
    },

    productVariant: {
      findFirst: async ({ where }: any) => {
        for (const v of store.variants.values()) {
          if (where.id && v.id !== where.id) continue;
          if (where.productId && v.productId !== where.productId) continue;
          return v;
        }
        return null;
      },
      findMany: async ({ where }: any = {}) => {
        const ids: string[] = where?.id?.in ?? [];
        if (!ids.length) return [];
        const out: any[] = [];
        for (const id of ids) {
          const v = store.variants.get(id);
          if (v) out.push(v);
        }
        return out;
      },
      update: async ({ where, data }: any) => {
        const v = store.variants.get(where.id);
        if (!v) throw new Error(`variant ${where.id} not found`);
        if (data.stock?.increment !== undefined) v.stock += data.stock.increment;
        if (data.stock?.decrement !== undefined) v.stock -= data.stock.decrement;
        return v;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const v of store.variants.values()) {
          if (where.id && v.id !== where.id) continue;
          if (where.stock?.gte !== undefined && !(v.stock >= where.stock.gte)) continue;
          if (data.stock?.decrement !== undefined) v.stock -= data.stock.decrement;
          if (data.stock?.increment !== undefined) v.stock += data.stock.increment;
          count++;
        }
        return { count };
      },
    },

    customer: {
      findUnique: async ({ where }: any) => store.customers.get(where.id) ?? null,
      findFirst: async ({ where }: any) => {
        for (const c of store.customers.values()) {
          if (where.wechatOpenId && c.wechatOpenId !== where.wechatOpenId) continue;
          return c;
        }
        return null;
      },
    },

    customerAddress: {
      findFirst: async ({ where }: any) => {
        for (const a of store.customerAddresses.values()) {
          if (where.id && a.id !== where.id) continue;
          if (where.customerId && a.customerId !== where.customerId) continue;
          return a;
        }
        return null;
      },
    },

    coupon: {
      findUnique: async ({ where }: any) => store.coupons.get(where.code) ?? null,
      updateMany: async ({ where, data }: any) => {
        const c = store.coupons.get(where.code);
        if (!c) return { count: 0 };
        if (where.usedCount?.gt !== undefined && !(c.usedCount > where.usedCount.gt)) {
          return { count: 0 };
        }
        if (data.usedCount?.decrement !== undefined) c.usedCount -= data.usedCount.decrement;
        if (data.usedCount?.increment !== undefined) c.usedCount += data.usedCount.increment;
        return { count: 1 };
      },
    },

    order: {
      create: async ({ data, include }: any) => {
        const id = nextId('ord');
        const order: any = {
          id,
          status: data.status ?? 'PENDING',
          paymentStatus: data.paymentStatus ?? 'UNPAID',
          isPreorder: data.isPreorder ?? false,
          discountCents: data.discountCents ?? 0,
          depositCents: data.depositCents ?? 0,
          balanceCents: data.balanceCents ?? 0,
          depositPaidAt: data.depositPaidAt ?? null,
          balancePaidAt: data.balancePaidAt ?? null,
          balanceDueBy: null,
          gracePeriodEndsAt: data.gracePeriodEndsAt ?? null,
          balancePaypalOrderId: null,
          balanceWechatTransactionId: null,
          paypalOrderId: data.paypalOrderId ?? null,
          wechatTransactionId: data.wechatTransactionId ?? null,
          locale: data.locale ?? 'en',
          channel: data.channel ?? 'WEB',
          customerId: data.customerId ?? null,
          guestAccessTokenHash: data.guestAccessTokenHash ?? null,
          couponCode: data.couponCode ?? null,
          subtotalPriceCents: data.subtotalPriceCents,
          totalPriceCents: data.totalPriceCents,
          orderNo: data.orderNo,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone ?? null,
          country: data.country,
          stateOrProvince: data.stateOrProvince ?? null,
          city: data.city,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 ?? null,
          postalCode: data.postalCode ?? null,
          currency: data.currency ?? 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.orders.set(id, order);

        const itemCreates = data.items?.create ?? [];
        const items: any[] = [];
        for (const it of itemCreates) {
          const itemId = nextId('oitem');
          const item = {
            id: itemId,
            orderId: id,
            ...it,
          };
          store.orderItems.set(itemId, item);
          items.push(item);
        }
        if (include?.items) order.items = items;
        return order;
      },
      findUnique: async ({ where, include }: any) => {
        let order: any = null;
        if (where.id) order = store.orders.get(where.id);
        else if (where.orderNo) {
          for (const o of store.orders.values()) if (o.orderNo === where.orderNo) { order = o; break; }
        }
        if (!order) return null;
        return decorateOrder(order, include, store);
      },
      findFirst: async ({ where, include }: any) => {
        for (const o of store.orders.values()) {
          if (where.id && o.id !== where.id) continue;
          if (where.customerId && o.customerId !== where.customerId) continue;
          if (where.paymentStatus && o.paymentStatus !== where.paymentStatus) continue;
          return decorateOrder(o, include, store);
        }
        return null;
      },
      findMany: async ({ where, include }: any = {}) => {
        const out: any[] = [];
        for (const o of store.orders.values()) {
          if (where?.id && o.id !== where.id) continue;
          if (where?.paymentStatus && o.paymentStatus !== where.paymentStatus) continue;
          out.push(decorateOrder(o, include, store));
        }
        return out;
      },
      update: async ({ where, data, include }: any) => {
        const o = store.orders.get(where.id);
        if (!o) throw new Error(`order ${where.id} not found`);
        Object.assign(o, data);
        o.updatedAt = new Date();
        return decorateOrder(o, include, store);
      },
      count: async () => store.orders.size,
    },

    paymentIntent: {
      create: async ({ data }: any) => {
        const id = nextId('pi');
        const pi = {
          id,
          isBalance: false,
          couponCode: null,
          discountCents: null,
          capturedAt: null,
          orderId: null,
          wechatTransactionId: null,
          paypalOrderId: null,
          wechatPrepayId: null,
          wechatOutTradeNo: null,
          shippingAddressJson: null,
          email: null,
          customerId: null,
          ...data,
          createdAt: new Date(),
        };
        store.paymentIntents.set(id, pi);
        return pi;
      },
      findUnique: async ({ where }: any) => {
        for (const pi of store.paymentIntents.values()) {
          if (where.paypalOrderId && pi.paypalOrderId === where.paypalOrderId) return pi;
          if (where.id && pi.id === where.id) return pi;
        }
        return null;
      },
      findFirst: async ({ where, orderBy: _ob }: any) => {
        const matches: any[] = [];
        for (const pi of store.paymentIntents.values()) {
          if (where.wechatOutTradeNo && pi.wechatOutTradeNo !== where.wechatOutTradeNo) continue;
          if (where.customerId && pi.customerId !== where.customerId) continue;
          if (where.provider && pi.provider !== where.provider) continue;
          if (where.status && pi.status !== where.status) continue;
          matches.push(pi);
        }
        if (!matches.length) return null;
        matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return matches[0];
      },
      findMany: async ({ where }: any) => {
        const out: any[] = [];
        for (const pi of store.paymentIntents.values()) {
          if (where.orderId && pi.orderId !== where.orderId) continue;
          if (where.status && pi.status !== where.status) continue;
          if (where.isBalance !== undefined && pi.isBalance !== where.isBalance) continue;
          if (where.createdAt?.lt && !(pi.createdAt < where.createdAt.lt)) continue;
          out.push(pi);
        }
        return out;
      },
      update: async ({ where, data }: any) => {
        const pi = store.paymentIntents.get(where.id);
        if (!pi) throw new Error(`pi ${where.id} not found`);
        Object.assign(pi, data);
        return pi;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const pi of store.paymentIntents.values()) {
          if (where.orderId && pi.orderId !== where.orderId) continue;
          if (where.status && pi.status !== where.status) continue;
          if (where.isBalance !== undefined && pi.isBalance !== where.isBalance) continue;
          Object.assign(pi, data);
          count++;
        }
        return { count };
      },
      count: async ({ where }: any) => {
        let count = 0;
        for (const pi of store.paymentIntents.values()) {
          if (where.orderId && pi.orderId !== where.orderId) continue;
          if (where.status && pi.status !== where.status) continue;
          count++;
        }
        return count;
      },
    },

    refund: {
      create: async ({ data }: any) => {
        const id = nextId('rf');
        const refund = { id, createdAt: new Date(), ...data };
        store.refunds.set(id, refund);
        return refund;
      },
      findFirst: async ({ where, include }: any) => {
        for (const r of store.refunds.values()) {
          if (where.wechatRefundNo && r.wechatRefundNo !== where.wechatRefundNo) continue;
          if (include?.order) {
            const order = store.orders.get(r.orderId);
            return { ...r, order: order ? decorateOrder(order, include.order.include, store) : null };
          }
          return r;
        }
        return null;
      },
      update: async ({ where, data }: any) => {
        const r = store.refunds.get(where.id);
        if (!r) throw new Error(`refund ${where.id} not found`);
        Object.assign(r, data);
        return r;
      },
    },

    // Used by OrdersService.reserveCoupon (`UPDATE Coupon SET usedCount + 1 ...`).
    // We don't parse the SQL — we mimic the side effect on the only coupon
    // the tests use. The fact this code path runs at all is the integration
    // signal we care about.
    $executeRaw: async (..._args: any[]) => {
      // The raw query updates a single coupon by code. Find any active
      // coupon under its limit and bump its counter.
      for (const c of store.coupons.values()) {
        if (!c.isActive) continue;
        if (c.maxUsageTimes !== null && c.usedCount >= c.maxUsageTimes) continue;
        c.usedCount += 1;
        return 1;
      }
      return 0;
    },

    $queryRaw: async () => {
      // SELECT id, stock FROM ProductVariant WHERE id = ... FOR UPDATE
      // The caller already passed the variant id in via template string —
      // since we have no real DB we return all variants and let the caller
      // match. createCartOrder filters by stock anyway, so returning the
      // full list is benign.
      return Array.from(store.variants.values()).map((v) => ({ id: v.id, stock: v.stock }));
    },

    $transaction: async (fn: any) => {
      // Callbacks receive the same handle — Prisma's tx behaves like prisma
      // semantically for our purposes (writes visible immediately within
      // the callback). No rollback simulation: throw propagates and any
      // writes made before the throw stay, which is acceptable for tests
      // that only exercise happy-path side effects.
      return fn(handle);
    },
  };

  return handle;
}

function decorateOrder(order: any, include: any, store: FakeStore) {
  if (!include) return order;
  const decorated: any = { ...order };
  if (include.items) {
    decorated.items = Array.from(store.orderItems.values()).filter((it) => it.orderId === order.id);
  }
  if (include.refunds) {
    decorated.refunds = Array.from(store.refunds.values()).filter((r) => r.orderId === order.id);
  }
  if (include.shipments) {
    decorated.shipments = Array.from(store.shipments.values()).filter((s) => s.orderId === order.id);
  }
  if (include.paymentIntents) {
    decorated.paymentIntents = Array.from(store.paymentIntents.values()).filter((p) => p.orderId === order.id);
  }
  return decorated;
}

