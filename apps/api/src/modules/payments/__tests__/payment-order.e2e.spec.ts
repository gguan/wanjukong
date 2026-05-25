/**
 * E2E: order placement across the payment chain.
 *
 * Drives the real OrdersService + PaymentsService against an in-memory
 * Prisma double and a stub PayPal / WeChat provider. Covers the two
 * supported checkout funnels — PayPal cart for the web storefront and
 * WeChat Pay for the mini program — from cart submission through to a
 * persisted order row with the correct stock decrement, payment status,
 * and audit trail.
 *
 * What this proves at the integration boundary (and what existing
 * service-level specs do NOT cover):
 *   - PaymentsService.createPayPalOrderFromCart calls into OrdersService
 *     for coupon reservation and PaypalProvider for the upstream order,
 *     then writes a CREATED PaymentIntent with the right amount.
 *   - captureAndCreateOrder reads back that PaymentIntent, asks Paypal
 *     to capture, mints an Order via OrdersService.createCartOrder, and
 *     flips the intent to ORDER_CREATED with the new orderId.
 *   - createWechatOrder creates an UNPAID order first (so stock is held
 *     before we hand control to WeChat) and rolls back the order on
 *     prepay failure.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PaymentsService } from '../payments.service';
import { OrdersService } from '../../orders/orders.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { MailerService } from '../../mailer/mailer.service';
import type { PaypalProvider } from '../providers/paypal.provider';
import type { WechatPayProvider } from '../providers/wechat-pay.provider';
import { FakeStore, buildPrismaHandle } from './fake-store';

function makeMailer() {
  return {
    sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailerService;
}

function makePaypalProvider(overrides: Partial<{
  createOrder: (...a: any[]) => any;
  captureOrder: (...a: any[]) => any;
}> = {}) {
  return {
    createOrder: overrides.createOrder ?? vi.fn(async (params: any) => ({
      providerOrderId: `PP-ORDER-${params.outTradeNo}`,
      clientPayload: { paypalOrderId: `PP-ORDER-${params.outTradeNo}` },
    })),
    captureOrder: overrides.captureOrder ?? vi.fn(async (paypalOrderId: string) => ({
      id: paypalOrderId,
      purchaseUnits: [
        { payments: { captures: [{ amount: { value: '49.99', currencyCode: 'USD' } }] } },
      ],
    })),
  } as unknown as PaypalProvider;
}

function makeWechatProvider(overrides: Partial<{
  createOrder: (...a: any[]) => any;
  closeOrder: (...a: any[]) => any;
}> = {}) {
  return {
    createOrder: overrides.createOrder ?? vi.fn(async (_params: any) => ({
      providerOrderId: 'wx_prepay_test',
      clientPayload: {
        appId: 'wxapp', timeStamp: '1', nonceStr: 'n', package: 'prepay_id=wx_prepay_test', signType: 'RSA', paySign: 'sig',
      },
    })),
    closeOrder: overrides.closeOrder ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as WechatPayProvider;
}

interface Harness {
  store: FakeStore;
  prisma: PrismaService;
  orders: OrdersService;
  payments: PaymentsService;
  paypal: PaypalProvider;
  wechat: WechatPayProvider;
  mailer: MailerService;
}

function setup(opts: { paypal?: PaypalProvider; wechat?: WechatPayProvider } = {}): Harness {
  const store = new FakeStore();
  const prisma = buildPrismaHandle(store) as PrismaService;
  const mailer = makeMailer();
  const orders = new OrdersService(prisma, mailer);
  const paypal = opts.paypal ?? makePaypalProvider();
  const wechat = opts.wechat ?? makeWechatProvider();
  const payments = new PaymentsService(prisma, orders, mailer, paypal, wechat);
  return { store, prisma, orders, payments, paypal, wechat, mailer };
}

// Common fixture: one in-stock product + variant priced at $49.99 / ¥49900.
function seedInStock(store: FakeStore, stock = 5) {
  store.seedProduct({
    id: 'p1', name: 'Raiden 1/6', slug: 'raiden-16',
    status: 'ACTIVE', saleType: 'IN_STOCK',
  });
  store.seedVariant({
    id: 'v1', productId: 'p1', name: 'Standard', sku: 'RDN-STD',
    priceCents: 49900, usdPriceCents: 4999, stock,
  });
}

describe('E2E: PayPal cart checkout (storefront)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a CREATED PaymentIntent matching the cart total', async () => {
    const h = setup();
    seedInStock(h.store);

    const result = await h.payments.createPayPalOrderFromCart({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      currency: 'USD',
      email: 'buyer@example.com',
    });

    expect(result.paypalOrderId).toMatch(/^PP-ORDER-/);
    expect(result.totalCents).toBe(4999);
    expect(h.paypal.createOrder).toHaveBeenCalledTimes(1);

    const pis = Array.from(h.store.paymentIntents.values());
    expect(pis).toHaveLength(1);
    expect(pis[0]).toMatchObject({
      provider: 'PAYPAL',
      status: 'CREATED',
      amountCents: 4999,
      currency: 'USD',
      paypalOrderId: result.paypalOrderId,
    });
    // Stock NOT yet decremented — that happens at capture time.
    expect(h.store.variants.get('v1')!.stock).toBe(5);
  });

  it('captures, creates the Order, decrements stock, and flips the intent', async () => {
    const h = setup();
    seedInStock(h.store);

    const { paypalOrderId } = await h.payments.createPayPalOrderFromCart({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      currency: 'USD',
      email: 'buyer@example.com',
    });

    const capture = await h.payments.captureAndCreateOrder({
      paypalOrderId,
      fullName: 'Test Buyer',
      email: 'buyer@example.com',
      country: 'US',
      city: 'Shanghai',
      addressLine1: 'Road 1',
      currency: 'USD',
    });

    expect(capture.orderNo).toMatch(/^WJK-/);
    expect(capture.guestAccessToken).toMatch(/^[a-f0-9]{64}$/);

    // Order persisted with PAID status (in-stock => no balance).
    const order = Array.from(h.store.orders.values())[0];
    expect(order).toMatchObject({
      orderNo: capture.orderNo,
      paymentStatus: 'PAID',
      status: 'PENDING',
      currency: 'USD',
      totalPriceCents: 4999,
      paypalOrderId,
      channel: 'WEB',
    });
    expect(order.depositPaidAt).toBeInstanceOf(Date);
    expect(order.balancePaidAt).toBeInstanceOf(Date);

    // Items snapshot
    const items = Array.from(h.store.orderItems.values()).filter((i) => i.orderId === order.id);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productNameSnapshot: 'Raiden 1/6',
      skuSnapshot: 'RDN-STD',
      quantity: 1,
      unitPriceCents: 4999,
    });

    // Stock decremented + PaymentIntent flipped
    expect(h.store.variants.get('v1')!.stock).toBe(4);
    const pi = Array.from(h.store.paymentIntents.values())[0];
    expect(pi.status).toBe('ORDER_CREATED');
    expect(pi.orderId).toBe(order.id);
    expect(pi.capturedAt).toBeInstanceOf(Date);

    // Confirmation email fired with the guest token
    expect(h.mailer.sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
    expect((h.mailer.sendOrderConfirmationEmail as any).mock.calls[0][0]).toMatchObject({
      email: 'buyer@example.com',
      orderNo: capture.orderNo,
      guestAccessToken: capture.guestAccessToken,
    });
  });

  it('is idempotent — re-capturing the same paypal order returns the original orderNo', async () => {
    const h = setup();
    seedInStock(h.store);

    const { paypalOrderId } = await h.payments.createPayPalOrderFromCart({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      currency: 'USD',
    });

    const first = await h.payments.captureAndCreateOrder({
      paypalOrderId, fullName: 'A', email: 'a@x.com', country: 'US', city: 'SH', addressLine1: '1', currency: 'USD',
    });
    const second = await h.payments.captureAndCreateOrder({
      paypalOrderId, fullName: 'A', email: 'a@x.com', country: 'US', city: 'SH', addressLine1: '1', currency: 'USD',
    });

    expect(second.orderNo).toBe(first.orderNo);
    // Upstream capture must NOT fire twice.
    expect(h.paypal.captureOrder).toHaveBeenCalledTimes(1);
    expect(h.store.orders.size).toBe(1);
    // Stock decremented exactly once.
    expect(h.store.variants.get('v1')!.stock).toBe(4);
  });

  it('rejects capture when PayPal returns a mismatched amount and releases the coupon', async () => {
    const wrongCapture = vi.fn(async (id: string) => ({
      id,
      purchaseUnits: [
        { payments: { captures: [{ amount: { value: '1.00', currencyCode: 'USD' } }] } },
      ],
    }));
    const h = setup({ paypal: makePaypalProvider({ captureOrder: wrongCapture }) });
    seedInStock(h.store);
    h.store.seedCoupon({ code: 'TEN', discountType: 'FIXED', discountValue: 500 });

    const { paypalOrderId } = await h.payments.createPayPalOrderFromCart({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      currency: 'USD',
      couponCode: 'TEN',
    });
    expect(h.store.coupons.get('TEN')!.usedCount).toBe(1);

    await expect(
      h.payments.captureAndCreateOrder({
        paypalOrderId, fullName: 'A', email: 'a@x.com', country: 'US', city: 'SH', addressLine1: '1', currency: 'USD',
      }),
    ).rejects.toThrowError(/amount mismatch/i);

    const pi = Array.from(h.store.paymentIntents.values())[0];
    expect(pi.status).toBe('FAILED');
    expect(h.store.orders.size).toBe(0);
    expect(h.store.coupons.get('TEN')!.usedCount).toBe(0);
  });

  it('reserves a coupon at create-order time and reflects the discount in the charged amount', async () => {
    const h = setup();
    seedInStock(h.store);
    h.store.seedCoupon({ code: 'SAVE10', discountType: 'PERCENTAGE', discountValue: 10 });

    const result = await h.payments.createPayPalOrderFromCart({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      currency: 'USD',
      couponCode: 'SAVE10',
    });

    expect(result.discountCents).toBe(Math.round(4999 * 0.1));
    expect(result.totalCents).toBe(4999 - Math.round(4999 * 0.1));
    expect(h.store.coupons.get('SAVE10')!.usedCount).toBe(1);
  });
});

describe('E2E: WeChat Pay mini-program checkout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reserves stock by creating an UNPAID order before calling WeChat', async () => {
    const h = setup();
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', name: 'Alice', wechatOpenId: 'wx_openid_1' });

    const callOrder: string[] = [];
    (h.wechat.createOrder as any).mockImplementation(async () => {
      // At this point the UNPAID order must already exist.
      callOrder.push('wechat.createOrder');
      return {
        providerOrderId: 'prepay_x',
        clientPayload: { paySign: 's', appId: 'a', timeStamp: '1', nonceStr: 'n', package: 'p', signType: 'RSA' },
      };
    });

    const result = await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
    });

    expect(result.orderNo).toMatch(/^WJK-/);
    expect(result.payParams.paySign).toBe('s');

    const order = Array.from(h.store.orders.values())[0];
    expect(order).toMatchObject({
      orderNo: result.orderNo,
      paymentStatus: 'UNPAID',
      currency: 'CNY',
      channel: 'MINIPROGRAM',
      customerId: 'c1',
    });
    // Stock decremented up-front (reservation).
    expect(h.store.variants.get('v1')!.stock).toBe(4);

    const pi = Array.from(h.store.paymentIntents.values())[0];
    expect(pi).toMatchObject({
      provider: 'WECHAT_PAY',
      status: 'CREATED',
      orderId: order.id,
      amountCents: 49900,
    });
    expect(callOrder).toEqual(['wechat.createOrder']);
  });

  it('rolls back the UNPAID order and restores stock when WeChat prepay fails', async () => {
    const wechat = makeWechatProvider({
      createOrder: vi.fn().mockRejectedValue(new Error('WeChat 5xx')),
    });
    const h = setup({ wechat });
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });

    await expect(
      h.payments.createWechatOrder({
        items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
        customerId: 'c1',
      }),
    ).rejects.toThrowError(/WeChat 5xx/);

    // Order was created then cancelled — stock back to original.
    expect(h.store.variants.get('v1')!.stock).toBe(5);
    const orders = Array.from(h.store.orders.values());
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe('CANCELLED');
    expect(orders[0].paymentStatus).toBe('FAILED');
  });

  it('rejects a wechat checkout when the customer has no openid bound', async () => {
    const h = setup();
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com' /* no wechatOpenId */ });

    await expect(
      h.payments.createWechatOrder({
        items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
        customerId: 'c1',
      }),
    ).rejects.toThrow();
    expect(h.store.orders.size).toBe(0);
    expect(h.store.variants.get('v1')!.stock).toBe(5);
  });
});
