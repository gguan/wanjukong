/**
 * E2E: payment provider callbacks (webhooks).
 *
 * Verifies the inbound side of the chain: a successful WeChat Pay
 * notification flips the right Order / PaymentIntent, while malformed,
 * replayed, or amount-mismatched notifications leave state untouched.
 * Also exercises refund notifications driving an order to REFUNDED with
 * stock restoration.
 *
 * Signature / decryption are mocked at the provider level — those are
 * unit-tested elsewhere. The point of these specs is the service-layer
 * decision tree once the provider has said "this transaction is valid":
 * idempotency, deposit-vs-balance branching, coupon release on failure,
 * stock restoration on full refund.
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

// Stubbed WeChat provider: signature / timestamp always valid; the decrypted
// resource is whatever the test set via `transaction = ...`.
function makeWechatProvider(transaction: any, refundResource?: any) {
  return {
    createOrder: vi.fn(async () => ({
      providerOrderId: 'prepay_x',
      clientPayload: {
        appId: 'a', timeStamp: '1', nonceStr: 'n', package: 'prepay_id=prepay_x', signType: 'RSA', paySign: 's',
      },
    })),
    closeOrder: vi.fn().mockResolvedValue(undefined),
    refundOrder: vi.fn().mockResolvedValue({ refundId: 'wxrf_1', status: 'SUCCESS' }),
    verifyNotificationTimestamp: vi.fn().mockReturnValue(true),
    verifyNotificationSignature: vi.fn().mockReturnValue(true),
    decryptNotificationResource: vi.fn((res: any) => {
      // Tests pass `transaction` via the encrypted body; for refund flows the
      // test pre-sets refundResource.
      if (res?._kind === 'refund' && refundResource) return refundResource;
      return transaction;
    }),
  } as unknown as WechatPayProvider;
}

function makePaypal() {
  return {
    createOrder: vi.fn(async (p: any) => ({
      providerOrderId: `PP-${p.outTradeNo}`,
      clientPayload: { paypalOrderId: `PP-${p.outTradeNo}` },
    })),
    captureOrder: vi.fn(),
  } as unknown as PaypalProvider;
}

function setup(transaction: any, refundResource?: any) {
  const store = new FakeStore();
  const prisma = buildPrismaHandle(store) as PrismaService;
  const mailer = makeMailer();
  const orders = new OrdersService(prisma, mailer);
  const paypal = makePaypal();
  const wechat = makeWechatProvider(transaction, refundResource);
  const payments = new PaymentsService(prisma, orders, mailer, paypal, wechat);
  return { store, prisma, orders, payments, paypal, wechat, mailer };
}

function seedInStock(store: FakeStore, stock = 5) {
  store.seedProduct({ id: 'p1', name: 'Raiden', slug: 'raiden', status: 'ACTIVE', saleType: 'IN_STOCK' });
  store.seedVariant({ id: 'v1', productId: 'p1', name: 'Std', sku: 'rd-std', priceCents: 49900, stock });
}

function fakeNotificationHeaders() {
  return {
    'wechatpay-signature': 'sig',
    'wechatpay-timestamp': String(Math.floor(Date.now() / 1000)),
    'wechatpay-nonce': 'nonce',
    'wechatpay-serial': 'serial',
  };
}

function paySuccessBody(): any {
  return {
    id: 'evt_1',
    event_type: 'TRANSACTION.SUCCESS',
    resource: { algorithm: 'AEAD_AES_256_GCM', ciphertext: 'cipher', nonce: 'n', associated_data: 'ad' },
  };
}

describe('E2E: WeChat Pay payment notification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('flips the matching order to PAID and the intent to ORDER_CREATED', async () => {
    const h = setup({
      out_trade_no: '', // filled in after createWechatOrder runs
      transaction_id: 'wx_tx_1',
      trade_state: 'SUCCESS',
      payer: { openid: 'wx_openid_1' },
      amount: { total: 49900, payer_total: 49900 },
    });
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', name: 'Alice', wechatOpenId: 'wx_openid_1' });

    // Drive a real createWechatOrder so the out_trade_no in the PI matches
    // what the notification claims.
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
      fakeNotificationHeaders() as any,
      paySuccessBody(),
      JSON.stringify(paySuccessBody()),
    );

    const order = Array.from(h.store.orders.values())[0];
    expect(order.paymentStatus).toBe('PAID');
    expect(order.wechatTransactionId).toBe('wx_tx_1');
    expect(order.depositPaidAt).toBeInstanceOf(Date);
    expect(order.balancePaidAt).toBeInstanceOf(Date);

    const piAfter = h.store.paymentIntents.get(pi.id);
    expect(piAfter.status).toBe('ORDER_CREATED');
    expect(piAfter.capturedAt).toBeInstanceOf(Date);
    expect(piAfter.wechatTransactionId).toBe('wx_tx_1');

    // Confirmation email fires to the customer's email.
    expect(h.mailer.sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — a replayed notification does not double-update the order', async () => {
    const h = setup({});
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });
    await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
    });
    const pi = Array.from(h.store.paymentIntents.values())[0];
    (h.wechat.decryptNotificationResource as any).mockReturnValue({
      out_trade_no: pi.wechatOutTradeNo,
      transaction_id: 'wx_tx_first',
      trade_state: 'SUCCESS',
      payer: { openid: 'wx_openid_1' },
      amount: { total: 49900, payer_total: 49900 },
    });

    await h.payments.handleWechatNotification(fakeNotificationHeaders() as any, paySuccessBody(), '');
    const firstSnap = { ...Array.from(h.store.orders.values())[0] };

    // Mutate the supposedly-decrypted resource to a different transaction id.
    // A correct idempotency check should reject this replay.
    (h.wechat.decryptNotificationResource as any).mockReturnValue({
      out_trade_no: pi.wechatOutTradeNo,
      transaction_id: 'wx_tx_replay',
      trade_state: 'SUCCESS',
      payer: { openid: 'wx_openid_1' },
      amount: { total: 49900, payer_total: 49900 },
    });
    await h.payments.handleWechatNotification(fakeNotificationHeaders() as any, paySuccessBody(), '');

    const order = Array.from(h.store.orders.values())[0];
    expect(order.wechatTransactionId).toBe(firstSnap.wechatTransactionId);
    // Email still only fires once.
    expect(h.mailer.sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it('marks the intent FAILED and releases the coupon when the paid amount mismatches', async () => {
    const h = setup({});
    seedInStock(h.store);
    h.store.seedCoupon({ code: 'TEN', discountType: 'FIXED', discountValue: 500 });
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });

    await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
      couponCode: 'TEN',
    });
    const pi = Array.from(h.store.paymentIntents.values())[0];
    expect(h.store.coupons.get('TEN')!.usedCount).toBe(1);

    (h.wechat.decryptNotificationResource as any).mockReturnValue({
      out_trade_no: pi.wechatOutTradeNo,
      transaction_id: 'wx_tx_X',
      trade_state: 'SUCCESS',
      payer: { openid: 'wx_openid_1' },
      amount: { total: 100, payer_total: 100 }, // way off
    });

    await h.payments.handleWechatNotification(fakeNotificationHeaders() as any, paySuccessBody(), '');

    const order = Array.from(h.store.orders.values())[0];
    expect(order.paymentStatus).toBe('UNPAID'); // notification rejected
    expect(h.store.paymentIntents.get(pi.id)!.status).toBe('FAILED');
    expect(h.store.coupons.get('TEN')!.usedCount).toBe(0);
  });

  it('rejects when the signature does not verify (no state change)', async () => {
    const h = setup({});
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });
    await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
    });
    (h.wechat.verifyNotificationSignature as any).mockReturnValue(false);

    await h.payments.handleWechatNotification(fakeNotificationHeaders() as any, paySuccessBody(), 'forged');

    const order = Array.from(h.store.orders.values())[0];
    expect(order.paymentStatus).toBe('UNPAID');
    expect(h.wechat.decryptNotificationResource).not.toHaveBeenCalled();
  });

  it('rejects when the timestamp is out of range (replay window)', async () => {
    const h = setup({});
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });
    await h.payments.createWechatOrder({
      items: [{ productId: 'p1', variantId: 'v1', quantity: 1 }],
      customerId: 'c1',
    });
    (h.wechat.verifyNotificationTimestamp as any).mockReturnValue(false);

    await h.payments.handleWechatNotification(fakeNotificationHeaders() as any, paySuccessBody(), '');

    expect(h.wechat.verifyNotificationSignature).not.toHaveBeenCalled();
    const order = Array.from(h.store.orders.values())[0];
    expect(order.paymentStatus).toBe('UNPAID');
  });

  it('ignores notifications for unknown out_trade_no', async () => {
    const h = setup({});
    (h.wechat.decryptNotificationResource as any).mockReturnValue({
      out_trade_no: 'nonexistent',
      transaction_id: 'wx_tx_X',
      trade_state: 'SUCCESS',
      payer: { openid: 'wx_openid_x' },
      amount: { total: 100, payer_total: 100 },
    });
    await h.payments.handleWechatNotification(fakeNotificationHeaders() as any, paySuccessBody(), '');
    // No orders or intents were touched.
    expect(h.store.orders.size).toBe(0);
    expect(h.store.paymentIntents.size).toBe(0);
  });
});

describe('E2E: WeChat Pay refund notification', () => {
  beforeEach(() => vi.clearAllMocks());

  async function setupPaidOrder() {
    const h = setup({});
    seedInStock(h.store);
    h.store.seedCustomer({ id: 'c1', email: 'c1@x.com', wechatOpenId: 'wx_openid_1' });
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
    await h.payments.handleWechatNotification(fakeNotificationHeaders() as any, paySuccessBody(), '');
    const order = Array.from(h.store.orders.values())[0];
    expect(order.paymentStatus).toBe('PAID');
    return { h, order };
  }

  it('marks the refund SUCCESS and flips a fully-refunded order to REFUNDED with stock restored', async () => {
    const { h, order } = await setupPaidOrder();

    // Admin initiates a full refund — Refund row created PENDING-ish.
    const refund = await h.payments.refundOrder(order.id, 49900, 'broken', 'admin-1');
    expect(h.wechat.refundOrder).toHaveBeenCalledTimes(1);

    // Stock already restored at refund-create time (because provider stub
    // returned SUCCESS synchronously). Order status flipped to REFUNDED.
    const afterCreate = h.store.orders.get(order.id);
    expect(afterCreate.paymentStatus).toBe('REFUNDED');
    expect(h.store.variants.get('v1')!.stock).toBe(5);

    // Now the refund webhook lands — refund stays SUCCESS, no double-restore.
    (h.wechat.decryptNotificationResource as any).mockReturnValue({
      out_refund_no: refund.wechatRefundNo,
      refund_id: 'wxrf_1',
      refund_status: 'SUCCESS',
      transaction_id: 'wx_tx_1',
      amount: { refund: 49900, payer_refund: 49900 },
    });
    await h.payments.handleWechatRefundNotification(
      fakeNotificationHeaders() as any,
      { id: 'r', event_type: 'REFUND.SUCCESS', resource: { algorithm: 'a', ciphertext: 'c', nonce: 'n', associated_data: 'ad' } } as any,
      '',
    );

    // Idempotency: still only one refund, still REFUNDED, stock still 5.
    expect(Array.from(h.store.refunds.values())).toHaveLength(1);
    expect(h.store.variants.get('v1')!.stock).toBe(5);
  });

  it('keeps the order PAID and does not restore stock on a partial refund', async () => {
    const { h, order } = await setupPaidOrder();

    await h.payments.refundOrder(order.id, 1000, 'minor', 'admin-1');

    const refreshed = h.store.orders.get(order.id);
    expect(refreshed.paymentStatus).toBe('PAID'); // not refunded
    expect(h.store.variants.get('v1')!.stock).toBe(4); // unchanged
  });

  it('rejects a refund larger than the remaining refundable amount', async () => {
    const { h, order } = await setupPaidOrder();

    await h.payments.refundOrder(order.id, 40000, undefined, 'admin-1');

    await expect(
      h.payments.refundOrder(order.id, 20000, undefined, 'admin-1'),
    ).rejects.toThrow();
  });
});
