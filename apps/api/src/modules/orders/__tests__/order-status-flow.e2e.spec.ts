/**
 * E2E: order status / cancel / refund transitions after a successful checkout.
 *
 * Picks up where the payment-order specs leave off — start with a PAID order
 * in the fake store and walk through:
 *   PENDING → CONFIRMED → SHIPPED → DELIVERED (admin path)
 *   UNPAID    cancel       → stock restored, coupon released
 *   DEPOSIT_PAID cancel-in-grace → wechat refund + stock restored
 *   DEPOSIT_PAID cancel-after-grace → rejected
 *   PAID    full refund   → REFUNDED + stock restored
 *
 * This is the seam between OrdersService and PaymentsService where the
 * old service-level specs only covered isolated pieces. Driving the real
 * services + an in-memory store proves they cooperate correctly.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrdersService } from '../orders.service';
import { PaymentsService } from '../../payments/payments.service';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { MailerService } from '../../mailer/mailer.service';
import type { PaypalProvider } from '../../payments/providers/paypal.provider';
import type { WechatPayProvider } from '../../payments/providers/wechat-pay.provider';
import { FakeStore, buildPrismaHandle } from '../../payments/__tests__/fake-store';

function makeMailer() {
  return {
    sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
    sendOrderStatusUpdateEmail: vi.fn().mockResolvedValue(undefined),
  } as unknown as MailerService;
}

function makePaypal() {
  return {
    createOrder: vi.fn(async (p: any) => ({ providerOrderId: `PP-${p.outTradeNo}`, clientPayload: { paypalOrderId: `PP-${p.outTradeNo}` } })),
    captureOrder: vi.fn(),
  } as unknown as PaypalProvider;
}

function makeWechat() {
  return {
    createOrder: vi.fn(async () => ({ providerOrderId: 'prepay_x', clientPayload: { paySign: 's', appId: 'a', timeStamp: '1', nonceStr: 'n', package: 'p', signType: 'RSA' } })),
    closeOrder: vi.fn().mockResolvedValue(undefined),
    refundOrder: vi.fn().mockResolvedValue({ refundId: 'wxrf_1', status: 'SUCCESS' }),
    verifyNotificationTimestamp: vi.fn().mockReturnValue(true),
    verifyNotificationSignature: vi.fn().mockReturnValue(true),
    decryptNotificationResource: vi.fn(),
  } as unknown as WechatPayProvider;
}

function setup() {
  const store = new FakeStore();
  const prisma = buildPrismaHandle(store) as PrismaService;
  const mailer = makeMailer();
  const orders = new OrdersService(prisma, mailer);
  const paypal = makePaypal();
  const wechat = makeWechat();
  const payments = new PaymentsService(prisma, orders, mailer, paypal, wechat);
  return { store, prisma, orders, payments, paypal, wechat, mailer };
}

function seedInStock(store: FakeStore, stock = 5) {
  store.seedProduct({ id: 'p1', name: 'Raiden', slug: 'raiden', status: 'ACTIVE', saleType: 'IN_STOCK' });
  store.seedVariant({ id: 'v1', productId: 'p1', name: 'Std', sku: 'rd-std', priceCents: 49900, stock });
}

/** Drive createCartOrder directly to land a PAID, full-price order with a wechat tx id. */
async function placePaidWechatOrder(h: ReturnType<typeof setup>) {
  h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', name: 'Alice', wechatOpenId: 'wx_openid_1' });
  await h.payments.createWechatOrder({
    items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
    customerId: 'c1',
  });
  const pi = Array.from(h.store.paymentIntents.values())[0];
  (h.wechat.decryptNotificationResource as any).mockReturnValue({
    out_trade_no: pi.wechatOutTradeNo,
    transaction_id: 'wx_tx_1',
    trade_state: 'SUCCESS',
    payer: { openid: 'wx_openid_1' },
    amount: { total: 49900, payer_total: 49900 },
  });
  await h.payments.handleWechatNotification(
    { 'wechatpay-signature': 's', 'wechatpay-timestamp': '0', 'wechatpay-nonce': 'n', 'wechatpay-serial': 'x' } as any,
    { id: 'e', event_type: 'TRANSACTION.SUCCESS', resource: { algorithm: 'a', ciphertext: 'c', nonce: 'n', associated_data: 'ad' } } as any,
    '',
  );
  return Array.from(h.store.orders.values())[0];
}

describe('E2E: admin order status transitions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('walks PENDING → CONFIRMED → SHIPPED → DELIVERED and sends one email per change', async () => {
    const h = setup();
    seedInStock(h.store);
    const order = await placePaidWechatOrder(h);
    expect(order.status).toBe('PENDING');

    for (const next of ['CONFIRMED', 'SHIPPED', 'DELIVERED'] as const) {
      const updated = await h.orders.updateOrderStatus(order.id, next);
      expect(updated.status).toBe(next);
    }
    const final = h.store.orders.get(order.id);
    expect(final.status).toBe('DELIVERED');
    expect(h.mailer.sendOrderStatusUpdateEmail).toHaveBeenCalledTimes(3);
  });

  it('refuses to mutate the status of a cancelled order', async () => {
    const h = setup();
    seedInStock(h.store);
    const order = await placePaidWechatOrder(h);

    await h.orders.updateOrderStatus(order.id, 'CANCELLED');
    await expect(
      h.orders.updateOrderStatus(order.id, 'SHIPPED'),
    ).rejects.toThrow();
  });

  it('updatePaymentStatus persists the new value', async () => {
    const h = setup();
    seedInStock(h.store);
    const order = await placePaidWechatOrder(h);

    await h.orders.updatePaymentStatus(order.id, 'REFUNDED');
    expect(h.store.orders.get(order.id)!.paymentStatus).toBe('REFUNDED');
  });
});

describe('E2E: cancel UNPAID order', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restores stock and releases the coupon when the customer cancels before paying', async () => {
    const h = setup();
    seedInStock(h.store);
    h.store.seedCoupon({ code: 'TEN', discountType: 'FIXED', discountValue: 500 });
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });

    await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
      couponCode: 'TEN',
    });
    const order = Array.from(h.store.orders.values())[0];
    expect(order.paymentStatus).toBe('UNPAID');
    expect(h.store.variants.get('v1')!.stock).toBe(4);
    expect(h.store.coupons.get('TEN')!.usedCount).toBe(1);

    await h.payments.cancelUnpaidOrder(order.id, 'c1');

    const after = h.store.orders.get(order.id);
    expect(after!.status).toBe('CANCELLED');
    expect(after!.paymentStatus).toBe('FAILED');
    expect(h.store.variants.get('v1')!.stock).toBe(5);
    expect(h.store.coupons.get('TEN')!.usedCount).toBe(0);

    const pi = Array.from(h.store.paymentIntents.values())[0];
    expect(pi.status).toBe('FAILED');
  });

  it('rejects a cancel from a customer who does not own the order', async () => {
    const h = setup();
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });
    await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
    });
    const order = Array.from(h.store.orders.values())[0];

    await expect(
      h.payments.cancelUnpaidOrder(order.id, 'someone-else'),
    ).rejects.toThrow();
    // Order unchanged.
    expect(h.store.orders.get(order.id)!.status).toBe('PENDING');
    expect(h.store.variants.get('v1')!.stock).toBe(4);
  });
});

describe('E2E: cancel DEPOSIT_PAID order within / after grace period', () => {
  beforeEach(() => vi.clearAllMocks());

  /** Manually craft a DEPOSIT_PAID wechat order — preorder simulation, since
   *  driving the full preorder flow needs more product/variant scaffolding
   *  than the cancel path itself cares about. */
  function seedDepositPaid(h: ReturnType<typeof setup>, opts: { gracePeriodEndsAt: Date }) {
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });
    const orderId = 'ord_test_1';
    h.store.orders.set(orderId, {
      id: orderId,
      orderNo: 'WJK-TEST-1',
      status: 'PENDING',
      paymentStatus: 'DEPOSIT_PAID',
      customerId: 'c1',
      currency: 'CNY',
      fullName: 'A', email: 'c1@x.com', country: 'CN', city: 'SH', addressLine1: '1', postalCode: null,
      subtotalPriceCents: 49900, totalPriceCents: 49900,
      isPreorder: true,
      depositCents: 4990, balanceCents: 44910,
      depositPaidAt: new Date(),
      gracePeriodEndsAt: opts.gracePeriodEndsAt,
      wechatTransactionId: 'wx_tx_dp',
      paypalOrderId: null,
      couponCode: null,
      discountCents: 0,
      channel: 'MINIPROGRAM',
      locale: 'zh-CN',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    h.store.orderItems.set('oitem_1', {
      id: 'oitem_1', orderId, productId: 'p1', variantId: 'v1',
      productNameSnapshot: 'Raiden', productSlugSnapshot: 'raiden',
      unitPriceCents: 49900, quantity: 1, totalPriceCents: 49900,
      isPreorder: true, depositCents: 4990,
    });
    // Stock was reserved at order placement.
    h.store.variants.get('v1')!.stock = 4;
  }

  it('refunds the deposit via WeChat and restores stock when cancelled in-window', async () => {
    const h = setup();
    seedDepositPaid(h, { gracePeriodEndsAt: new Date(Date.now() + 60 * 60_000) });

    await h.payments.cancelUnpaidOrder('ord_test_1', 'c1');

    expect(h.wechat.refundOrder).toHaveBeenCalledTimes(1);
    expect(h.wechat.refundOrder).toHaveBeenCalledWith(expect.objectContaining({
      transactionId: 'wx_tx_dp',
      refundCents: 4990,
      totalCents: 4990,
    }));
    const order = h.store.orders.get('ord_test_1')!;
    expect(order.status).toBe('CANCELLED');
    expect(order.paymentStatus).toBe('REFUNDED');
    expect(h.store.variants.get('v1')!.stock).toBe(5);
    // Refund row created with SUCCESS status (from the provider stub).
    const refunds = Array.from(h.store.refunds.values());
    expect(refunds).toHaveLength(1);
    expect(refunds[0]).toMatchObject({ orderId: 'ord_test_1', amountCents: 4990, status: 'SUCCESS' });
  });

  it('rejects cancel and leaves stock alone when the grace period has elapsed', async () => {
    const h = setup();
    seedDepositPaid(h, { gracePeriodEndsAt: new Date(Date.now() - 60 * 60_000) });

    await expect(
      h.payments.cancelUnpaidOrder('ord_test_1', 'c1'),
    ).rejects.toThrow();

    expect(h.wechat.refundOrder).not.toHaveBeenCalled();
    expect(h.store.orders.get('ord_test_1')!.paymentStatus).toBe('DEPOSIT_PAID');
    expect(h.store.variants.get('v1')!.stock).toBe(4);
  });
});

describe('E2E: admin-initiated refund on PAID order', () => {
  beforeEach(() => vi.clearAllMocks());

  it('full refund flips paymentStatus to REFUNDED, restores stock, releases coupon', async () => {
    const h = setup();
    seedInStock(h.store);
    h.store.seedCoupon({ code: 'TEN', discountType: 'FIXED', discountValue: 500 });
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', name: 'Alice', wechatOpenId: 'wx_openid_1' });

    await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
      couponCode: 'TEN',
    });
    const pi = Array.from(h.store.paymentIntents.values())[0];
    (h.wechat.decryptNotificationResource as any).mockReturnValue({
      out_trade_no: pi.wechatOutTradeNo,
      transaction_id: 'wx_tx_1',
      trade_state: 'SUCCESS',
      payer: { openid: 'wx_openid_1' },
      amount: { total: pi.amountCents, payer_total: pi.amountCents },
    });
    await h.payments.handleWechatNotification(
      { 'wechatpay-signature': 's', 'wechatpay-timestamp': '0', 'wechatpay-nonce': 'n', 'wechatpay-serial': 'x' } as any,
      { id: 'e', event_type: 'TRANSACTION.SUCCESS', resource: { algorithm: 'a', ciphertext: 'c', nonce: 'n', associated_data: 'ad' } } as any,
      '',
    );
    const paid = Array.from(h.store.orders.values())[0];
    expect(paid.paymentStatus).toBe('PAID');
    expect(h.store.coupons.get('TEN')!.usedCount).toBe(1);
    expect(h.store.variants.get('v1')!.stock).toBe(4);

    const refund = await h.payments.refundOrder(paid.id, paid.totalPriceCents, 'full refund', 'admin-1');
    expect(refund.status).toBe('SUCCESS');

    const after = h.store.orders.get(paid.id);
    expect(after!.paymentStatus).toBe('REFUNDED');
    expect(h.store.variants.get('v1')!.stock).toBe(5);
    expect(h.store.coupons.get('TEN')!.usedCount).toBe(0);
  });

  it('refuses to refund an order that is not PAID', async () => {
    const h = setup();
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });
    await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
    });
    const order = Array.from(h.store.orders.values())[0];

    await expect(
      h.payments.refundOrder(order.id, 100, undefined, 'admin-1'),
    ).rejects.toThrow();
  });
});
