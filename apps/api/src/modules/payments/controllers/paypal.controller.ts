import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import {
  IsString,
  IsArray,
  IsOptional,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../../admin-auth/decorators/public.decorator';
import { PaymentsService } from '../payments.service';

class CartItemDto {
  @IsString() productId!: string;
  @IsString() variantId!: string;
  // Constrain quantity — prevent sub-cent orders via fractional quantity
  // and mass-inflation via huge values. Matches the miniprogram DTO.
  @IsInt() @Min(1) @Max(10) quantity!: number;
}

class CreatePayPalOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsString() @IsOptional() currency?: string;
  @IsString() @IsOptional() couponCode?: string;
}

class CapturePayPalOrderDto {
  @IsString() paypalOrderId!: string;
  @IsString() fullName!: string;
  @IsEmail() email!: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() country!: string;
  @IsString() @IsOptional() stateOrProvince?: string;
  @IsString() city!: string;
  @IsString() addressLine1!: string;
  @IsString() @IsOptional() addressLine2?: string;
  @IsString() @IsOptional() postalCode?: string;
  @IsString() @IsOptional() currency?: string;
  @IsString() @IsOptional() locale?: string;
}

class CreateBalanceDto {
  @IsString() orderId!: string;
  /** Required for guest orders — must match the order's guest access token. */
  @IsString() @IsOptional() guestToken?: string;
}

class CaptureBalanceDto {
  @IsString() paypalOrderId!: string;
  /** Required for guest orders — must match the order's guest access token. */
  @IsString() @IsOptional() guestToken?: string;
}

type SessionRequest = Request & { session?: { customerId?: string } };

@Public()
@Controller('public/payments/paypal')
export class PaypalController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  createOrder(@Body() dto: CreatePayPalOrderDto, @Req() req: SessionRequest) {
    const customerId = req.session?.customerId || undefined;
    return this.paymentsService.createPayPalOrderFromCart({
      items: dto.items,
      currency: dto.currency,
      customerId,
      couponCode: dto.couponCode,
    });
  }

  @Post('capture-order')
  captureOrder(
    @Body() dto: CapturePayPalOrderDto,
    @Req() req: SessionRequest,
  ) {
    const customerId = req.session?.customerId || undefined;
    return this.paymentsService.captureAndCreateOrder({
      ...dto,
      customerId,
    });
  }

  /**
   * Create a PayPal balance payment for a DEPOSIT_PAID order.
   * Auth: caller must be the order's owning customer (via session) OR
   * present a valid guest token for a guest order.
   */
  @Post('create-balance')
  createBalance(@Body() dto: CreateBalanceDto, @Req() req: SessionRequest) {
    const customerId = req.session?.customerId ?? null;
    return this.paymentsService.createPayPalBalancePayment(
      dto.orderId,
      customerId,
      dto.guestToken ?? null,
    );
  }

  /**
   * Capture a PayPal balance payment (second phase of preorder flow).
   * Auth: same rules as create-balance — looks up the PaymentIntent and
   * verifies the caller is entitled to its associated order.
   */
  @Post('capture-balance')
  captureBalance(@Body() dto: CaptureBalanceDto, @Req() req: SessionRequest) {
    const customerId = req.session?.customerId ?? null;
    return this.paymentsService.capturePayPalBalance(
      dto.paypalOrderId,
      customerId,
      dto.guestToken ?? null,
    );
  }
}
