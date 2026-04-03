import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  BadRequestException,
  Logger,
  Req,
  RawBodyRequest,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../../admin-auth/decorators/public.decorator';
import { CustomerSessionAuthGuard } from '../../storefront-auth/guards/customer-session-auth.guard';
import { CurrentCustomer } from '../../storefront-auth/decorators/current-customer.decorator';
import { PaymentsService } from '../payments.service';
import {
  WechatPayNotificationHeaders,
  WechatPayNotificationBody,
} from '../providers/wechat-pay.provider';

class WechatCartItemDto {
  @IsString() productId!: string;
  @IsString() variantId!: string;
  @IsInt() @Min(1) @Max(10) quantity!: number;
}

class CreateWechatOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WechatCartItemDto)
  items!: WechatCartItemDto[];

  /** @deprecated — openid is now resolved server-side from the session */
  @IsString() @IsOptional() openid?: string;

  @IsString() @IsOptional() couponCode?: string;

  /** Customer's saved address ID — used to snapshot shipping address on the order */
  @IsString() @IsOptional() addressId?: string;

  @IsInt() @Min(0) @IsOptional() subtotalCents?: number;
}

/**
 * Miniprogram-only WeChat Pay endpoints.
 * Route prefix: /api/miniprogram/payment/wechat
 */
@Public()
@Controller('miniprogram/payment/wechat')
export class WechatPayController {
  private readonly logger = new Logger(WechatPayController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Step 1: Mini program calls this with cart items.
   * Resolves payer openid from the authenticated session.
   * Returns wx.requestPayment() params (appId, timeStamp, nonceStr, package, signType, paySign).
   */
  @UseGuards(CustomerSessionAuthGuard)
  @Post('create-order')
  createOrder(
    @Body() dto: CreateWechatOrderDto,
    @CurrentCustomer() customer: { id: string },
  ) {
    return this.paymentsService.createWechatOrder({
      items: dto.items,
      customerId: customer.id,
      couponCode: dto.couponCode,
      addressId: dto.addressId,
    });
  }

  /**
   * Cancel a pending WeChat prepay — called when user cancels wx.requestPayment().
   * The UNPAID order is kept so user can retry payment later.
   */
  @UseGuards(CustomerSessionAuthGuard)
  @Post('cancel-payment')
  cancelPayment(@CurrentCustomer() customer: { id: string }) {
    return this.paymentsService.cancelWechatPayment(customer.id);
  }

  /**
   * Retry payment for an existing UNPAID order.
   * Creates a new WeChat prepay order and returns wx.requestPayment() params.
   */
  @UseGuards(CustomerSessionAuthGuard)
  @Post('retry-payment')
  retryPayment(
    @Body() body: { orderId: string },
    @CurrentCustomer() customer: { id: string },
  ) {
    return this.paymentsService.retryWechatPayment(body.orderId, customer.id);
  }

  /**
   * Cancel an UNPAID order — restores stock and releases coupon.
   */
  @UseGuards(CustomerSessionAuthGuard)
  @Post('cancel-order')
  cancelUnpaidOrder(
    @Body() body: { orderId: string },
    @CurrentCustomer() customer: { id: string },
  ) {
    return this.paymentsService.cancelUnpaidOrder(body.orderId, customer.id);
  }

  /**
   * Step 2: WeChat Pay servers call this after successful payment.
   * Must return { code: 'SUCCESS' } to acknowledge receipt.
   */
  @Post('notify')
  @HttpCode(200)
  async handleNotification(
    @Headers() headers: WechatPayNotificationHeaders,
    @Body() body: WechatPayNotificationBody,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const timestamp = headers['wechatpay-timestamp'];
    if (!timestamp) {
      throw new BadRequestException('Missing wechatpay-timestamp header');
    }

    // Use raw body bytes for signature verification (not re-serialized JSON)
    const rawBody = req.rawBody?.toString('utf-8') || JSON.stringify(body);

    await this.paymentsService.handleWechatNotification(headers, body, rawBody);
    return { code: 'SUCCESS', message: 'OK' };
  }
}
