import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  CheckoutPaymentIntent,
  type Order,
  type OrderRequest,
} from '@paypal/paypal-server-sdk';
import {
  IPaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
} from '../interfaces/payment-provider.interface';

/**
 * Normalised refund status the rest of the app cares about. We collapse
 * PayPal's RefundStatus (COMPLETED | PENDING | CANCELLED | FAILED) into
 * three buckets that line up with our internal RefundStatus enum.
 */
export type PaypalRefundStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface PaypalRefundResult {
  refundId: string;
  status: PaypalRefundStatus;
}

/**
 * Pull the deposit/full-payment capture id out of a captureOrder response.
 * PayPal returns one capture per purchase unit; we only ever issue one
 * purchase unit, so the first capture is the right one.
 */
export function extractCaptureId(order: Order): string | undefined {
  return order?.purchaseUnits?.[0]?.payments?.captures?.[0]?.id ?? undefined;
}

/**
 * Thin wrapper around @paypal/paypal-server-sdk. The SDK manages OAuth
 * token caching, retries, and response typing, so the provider only
 * concerns itself with translating our CreateOrderParams into the SDK's
 * OrderRequest shape and surfacing meaningful errors.
 *
 * Environment selection: if PAYPAL_BASE_URL is unset or points at
 * api-m.sandbox.paypal.com we use Environment.Sandbox; any other value
 * (typically api-m.paypal.com in production) selects Environment.Production.
 */
@Injectable()
export class PaypalProvider implements IPaymentProvider {
  readonly providerName = 'PAYPAL';
  private readonly logger = new Logger(PaypalProvider.name);
  private _client: Client | null = null;
  private _orders: OrdersController | null = null;
  private _payments: PaymentsController | null = null;

  private get client(): Client {
    if (this._client) return this._client;
    const clientId = process.env.PAYPAL_CLIENT_ID || '';
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
    if (!clientId || !clientSecret) {
      throw new BadRequestException('PayPal credentials are not configured');
    }
    this._client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      timeout: 30_000,
      environment: this.resolveEnvironment(),
    });
    return this._client;
  }

  private get orders(): OrdersController {
    if (!this._orders) this._orders = new OrdersController(this.client);
    return this._orders;
  }

  private get payments(): PaymentsController {
    if (!this._payments) this._payments = new PaymentsController(this.client);
    return this._payments;
  }

  private resolveEnvironment(): Environment {
    const base = (process.env.PAYPAL_BASE_URL || '').toLowerCase();
    if (!base || base.includes('sandbox')) return Environment.Sandbox;
    return Environment.Production;
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const {
      amountCents,
      currency,
      outTradeNo,
      itemBreakdown,
      discountCents,
    } = params;
    const totalAmount = (amountCents / 100).toFixed(2);

    // Base purchase unit: total only. Itemization is layered on below
    // when it reconciles, otherwise we drop it rather than risk PayPal's
    // UNIT_AMOUNT_MISMATCH blocking the whole order.
    const purchaseUnit: NonNullable<OrderRequest['purchaseUnits']>[number] = {
      customId: outTradeNo,
      amount: {
        currencyCode: currency,
        value: totalAmount,
      },
    };

    if (itemBreakdown?.length) {
      const items = itemBreakdown.map((i) => ({
        name: i.name.slice(0, 127),
        unitAmount: {
          currencyCode: currency,
          value: (i.unitAmountCents / 100).toFixed(2),
        },
        quantity: String(i.quantity),
        ...(i.sku ? { sku: i.sku.slice(0, 127) } : {}),
      }));

      const itemTotalCents = itemBreakdown.reduce(
        (sum, i) => sum + i.unitAmountCents * i.quantity,
        0,
      );
      const discount = Math.max(0, discountCents ?? 0);
      const reconciled = itemTotalCents - discount;

      if (reconciled === amountCents) {
        const breakdown: NonNullable<
          NonNullable<typeof purchaseUnit.amount>['breakdown']
        > = {
          itemTotal: {
            currencyCode: currency,
            value: (itemTotalCents / 100).toFixed(2),
          },
        };
        if (discount > 0) {
          breakdown.discount = {
            currencyCode: currency,
            value: (discount / 100).toFixed(2),
          };
        }
        purchaseUnit.items = items;
        purchaseUnit.amount!.breakdown = breakdown;
      } else {
        this.logger.warn(
          `PayPal itemization skipped for ${outTradeNo}: items ${itemTotalCents}¢ − discount ${discount}¢ ≠ total ${amountCents}¢`,
        );
      }
    }

    try {
      const { result } = await this.orders.createOrder({
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [purchaseUnit],
        },
      });

      if (!result?.id) {
        throw new BadRequestException('PayPal returned no order id');
      }

      return {
        providerOrderId: result.id,
        clientPayload: { paypalOrderId: result.id },
      };
    } catch (err) {
      this.logger.error(
        `PayPal create order failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('PayPal create order failed');
    }
  }

  async captureOrder(paypalOrderId: string): Promise<Order> {
    try {
      const { result } = await this.orders.captureOrder({ id: paypalOrderId });
      return result;
    } catch (err) {
      this.logger.error(
        `PayPal capture failed for ${paypalOrderId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException('PayPal capture failed');
    }
  }

  /**
   * Refund a previously captured PayPal payment.
   *
   * `outRefundNo` is sent both as PayPal-Request-Id (idempotency — PayPal
   * caches the response for 45 days so a retry returns the same refund
   * instead of issuing a second one) and as `customId` so the refund is
   * reconcilable with our Refund row in PayPal reports.
   *
   * PayPal v2's RefundStatus is COMPLETED | PENDING | CANCELLED | FAILED.
   * We collapse it to SUCCESS | PENDING | FAILED to align with our own
   * RefundStatus enum and with what wechat-pay.provider returns.
   */
  async refundCapture(params: {
    captureId: string;
    outRefundNo: string;
    refundCents: number;
    currency: string;
    reason?: string;
  }): Promise<PaypalRefundResult> {
    const { captureId, outRefundNo, refundCents, currency, reason } = params;

    try {
      const { result } = await this.payments.refundCapturedPayment({
        captureId,
        paypalRequestId: outRefundNo,
        body: {
          amount: {
            currencyCode: currency,
            value: (refundCents / 100).toFixed(2),
          },
          customId: outRefundNo,
          ...(reason ? { noteToPayer: reason.slice(0, 255) } : {}),
        },
      });

      if (!result?.id) {
        throw new BadRequestException('PayPal returned no refund id');
      }

      return {
        refundId: result.id,
        status: this.normalizeRefundStatus(result.status),
      };
    } catch (err) {
      this.logger.error(
        `PayPal refund failed for capture ${captureId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('PayPal refund failed');
    }
  }

  private normalizeRefundStatus(status: string | undefined): PaypalRefundStatus {
    switch (status) {
      case 'COMPLETED':
        return 'SUCCESS';
      case 'PENDING':
        return 'PENDING';
      case 'CANCELLED':
      case 'FAILED':
        return 'FAILED';
      default:
        // Treat unknown PayPal statuses as PENDING — the refund webhook (or
        // a follow-up getRefund) will resolve to a terminal state.
        return 'PENDING';
    }
  }
}
