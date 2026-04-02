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
} from '@nestjs/common';
import type { Request } from 'express';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../../admin-auth/decorators/public.decorator';
import { PaymentsService } from '../payments.service';
import {
  WechatPayNotificationHeaders,
  WechatPayNotificationBody,
} from '../providers/wechat-pay.provider';

class WechatCartItemDto {
  @IsString() productId!: string;
  @IsString() variantId!: string;
  @IsNumber() quantity!: number;
}

class CreateWechatOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WechatCartItemDto)
  items!: WechatCartItemDto[];

  /** Payer's WeChat openid — obtained via wx.login() + code exchange on the server */
  @IsString() openid!: string;

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
   * Step 1: Mini program calls this with cart items + payer openid.
   * Returns wx.requestPayment() params (appId, timeStamp, nonceStr, package, signType, paySign).
   */
  @Post('create-order')
  createOrder(@Body() dto: CreateWechatOrderDto) {
    return this.paymentsService.createWechatOrder({
      items: dto.items,
      openid: dto.openid,
      couponCode: dto.couponCode,
      addressId: dto.addressId,
    });
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
