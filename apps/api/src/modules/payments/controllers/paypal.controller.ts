import { Controller, Post, Body, Req } from '@nestjs/common';
import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Public } from '../../admin-auth/decorators/public.decorator';
import { PaymentsService } from '../payments.service';

class CartItemDto {
  @IsString() productId!: string;
  @IsString() variantId!: string;
  @IsNumber() quantity!: number;
}

class CreatePayPalOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsString() @IsOptional() currency?: string;
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
}

@Public()
@Controller('public/payments/paypal')
export class PaypalController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  createOrder(@Body() dto: CreatePayPalOrderDto, @Req() req: any) {
    const customerId = req.session?.customerId || undefined;
    return this.paymentsService.createPayPalOrderFromCart({
      items: dto.items,
      currency: dto.currency,
      customerId,
    });
  }

  @Post('capture-order')
  captureOrder(@Body() dto: CapturePayPalOrderDto, @Req() req: any) {
    const customerId = req.session?.customerId || undefined;
    return this.paymentsService.captureAndCreateOrder({
      ...dto,
      customerId,
    });
  }
}
