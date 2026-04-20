import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  Client,
  Environment,
  OrdersController,
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
}
