import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  ApiError,
  Client,
  Environment,
  OrdersController,
  PaymentsController,
  CheckoutPaymentIntent,
  RefundStatus,
  type Order,
  type OrderRequest,
  type Refund,
} from '@paypal/paypal-server-sdk';
import {
  IPaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
} from '../interfaces/payment-provider.interface';

export interface PayPalRefundParams {
  /** PayPal capture id from the original capture response. */
  captureId: string;
  /**
   * Our caller-side idempotency key. Forwarded as `PayPal-Request-Id` so
   * retrying the same refund request returns the original Refund instead of
   * creating a second one, and as `custom_id` so it appears on settlement
   * reports next to the original capture's `customId`.
   */
  outRefundNo: string;
  /**
   * Amount to refund in minor units. Omit (or set ≤ 0) for a full refund —
   * PayPal infers the remaining refundable amount from the capture itself.
   */
  refundCents?: number;
  /** Currency code matching the original capture (e.g. USD). Required when refundCents is set. */
  currency?: string;
  /** Free-form reason shown in the payer's transaction history. */
  reason?: string;
}

export interface PayPalRefundResult {
  /** Maps PayPal's RefundStatus to our internal Refund state machine. */
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  /** PayPal-generated refund id (refund_id on settlement reports). */
  refundId: string;
  /** Raw status string from PayPal — surfaced for logging / debugging. */
  rawStatus: string;
  /** Refunded amount as PayPal echoed it back (minor units). */
  refundedCents?: number;
}

/** Subset of PayPal-side error conditions the service layer reacts on. */
export type PayPalRefundErrorCode =
  | 'CAPTURE_FULLY_REFUNDED'
  | 'AMOUNT_EXCEEDS_REFUNDABLE'
  | 'CAPTURE_DISPUTED'
  | 'INVALID_CAPTURE'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_ERROR';

export class PayPalRefundError extends Error {
  constructor(
    readonly code: PayPalRefundErrorCode,
    message: string,
    readonly cause?: unknown,
    readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'PayPalRefundError';
  }
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
   * Pull the PayPal-generated capture id out of a captureOrder response.
   * Returns null when the response is missing the field (e.g. PENDING /
   * DECLINED captures) — caller decides whether that is fatal.
   */
  static extractCaptureId(order: Order | null | undefined): string | null {
    return order?.purchaseUnits?.[0]?.payments?.captures?.[0]?.id ?? null;
  }

  /**
   * Refund a captured PayPal payment.
   *
   * Idempotency: callers must pass a stable `outRefundNo` per logical refund
   * request. We forward it as `PayPal-Request-Id` so a retry of the same
   * refund returns the original Refund record (PayPal caches keys for 45
   * days) rather than creating a duplicate refund.
   *
   * The returned `status` is normalised to our internal Refund state
   * machine:
   *   COMPLETED               → SUCCESS
   *   PENDING                 → PENDING  (refund is in flight, webhook will
   *                                       eventually update us)
   *   CANCELLED / FAILED      → FAILED
   *
   * Error contract: throws PayPalRefundError so the service layer can map
   * provider-specific failure modes (already refunded, exceeds amount,
   * timeout, generic) to the right user-facing error code.
   */
  async refundCapture(params: PayPalRefundParams): Promise<PayPalRefundResult> {
    const { captureId, outRefundNo, refundCents, currency, reason } = params;

    if (!captureId) {
      throw new PayPalRefundError(
        'INVALID_CAPTURE',
        'PayPal refund requires a capture id',
      );
    }
    if (refundCents !== undefined && refundCents > 0 && !currency) {
      // Defensive: a partial refund without a currency would let PayPal
      // silently fall back to the capture currency and we'd lose audit
      // signal. Force callers to be explicit.
      throw new PayPalRefundError(
        'INVALID_CAPTURE',
        'PayPal partial refund requires a currency',
      );
    }

    const body: {
      amount?: { value: string; currencyCode: string };
      customId?: string;
      noteToPayer?: string;
    } = {};

    if (refundCents !== undefined && refundCents > 0) {
      body.amount = {
        value: (refundCents / 100).toFixed(2),
        currencyCode: currency!,
      };
    }
    if (outRefundNo) body.customId = outRefundNo.slice(0, 127);
    if (reason) body.noteToPayer = reason.slice(0, 255);

    let result: Refund;
    try {
      const response = await this.payments.refundCapturedPayment({
        captureId,
        paypalRequestId: outRefundNo,
        prefer: 'return=representation',
        body,
      });
      result = response.result;
    } catch (err) {
      throw this.translateRefundError(err, captureId, outRefundNo);
    }

    if (!result?.id) {
      throw new PayPalRefundError(
        'PROVIDER_ERROR',
        'PayPal refund returned no refund id',
        result,
      );
    }

    const status = this.mapRefundStatus(result.status);
    const refundedCents = result.amount?.value
      ? Math.round(parseFloat(result.amount.value) * 100)
      : undefined;

    return {
      status,
      refundId: result.id,
      rawStatus: result.status ?? 'UNKNOWN',
      refundedCents,
    };
  }

  private mapRefundStatus(status: RefundStatus | undefined | string): PayPalRefundResult['status'] {
    switch (status) {
      case RefundStatus.Completed:
        return 'SUCCESS';
      case RefundStatus.Pending:
        return 'PENDING';
      case RefundStatus.Failed:
      case RefundStatus.Cancelled:
        return 'FAILED';
      default:
        // Treat unknown values as pending so the webhook can finalise the
        // state — failing fast here would falsely mark a refund FAILED
        // when PayPal added a new status enum.
        return 'PENDING';
    }
  }

  private translateRefundError(
    err: unknown,
    captureId: string,
    outRefundNo: string,
  ): PayPalRefundError {
    if (err instanceof PayPalRefundError) return err;

    // PayPal SDK's ApiError exposes a structured PayPal error body via
    // `result`. We don't depend on the exact runtime class to keep the unit
    // tests light, but we do extract the issues array shape PayPal docs
    // describes.
    const apiErr = err as ApiError & {
      result?: { name?: string; details?: Array<{ issue?: string }> };
      statusCode?: number;
    };
    const issues = apiErr?.result?.details ?? [];
    const firstIssue = issues[0]?.issue;
    const httpStatus = typeof apiErr?.statusCode === 'number' ? apiErr.statusCode : undefined;

    this.logger.error(
      `PayPal refund failed: captureId=${captureId} outRefundNo=${outRefundNo} ` +
        `httpStatus=${httpStatus ?? '?'} issue=${firstIssue ?? '?'} ` +
        `message=${err instanceof Error ? err.message : String(err)}`,
    );

    // PayPal returns these issue codes on 422 for the captures/refund endpoint.
    // https://developer.paypal.com/docs/api/payments/v2/#captures_refund
    switch (firstIssue) {
      case 'CAPTURE_FULLY_REFUNDED':
        return new PayPalRefundError(
          'CAPTURE_FULLY_REFUNDED',
          'Capture is already fully refunded',
          err,
          httpStatus,
        );
      case 'INVALID_REFUND_AMOUNT':
      case 'MAX_NUMBER_OF_REFUNDS_EXCEEDED':
      case 'REFUND_AMOUNT_EXCEEDED':
      case 'REFUND_CAPTURE_CURRENCY_MISMATCH':
        return new PayPalRefundError(
          'AMOUNT_EXCEEDS_REFUNDABLE',
          `Refund rejected by PayPal: ${firstIssue}`,
          err,
          httpStatus,
        );
      case 'PAYMENT_DENIED':
      case 'TRANSACTION_REFUSED':
      case 'CAPTURE_DISPUTED':
        return new PayPalRefundError(
          'CAPTURE_DISPUTED',
          `Capture cannot be refunded: ${firstIssue}`,
          err,
          httpStatus,
        );
      case 'INVALID_RESOURCE_ID':
      case 'RESOURCE_NOT_FOUND':
        return new PayPalRefundError(
          'INVALID_CAPTURE',
          `PayPal capture not found: ${captureId}`,
          err,
          httpStatus,
        );
    }

    // Network / SDK-side errors don't carry a `details` array.
    const message = err instanceof Error ? err.message : String(err);
    if (
      /timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|fetch failed/i.test(message)
    ) {
      return new PayPalRefundError(
        'PROVIDER_TIMEOUT',
        'PayPal refund timed out',
        err,
        httpStatus,
      );
    }

    return new PayPalRefundError(
      'PROVIDER_ERROR',
      `PayPal refund failed: ${message}`,
      err,
      httpStatus,
    );
  }
}
