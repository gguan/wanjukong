import { Controller, Post, Body, Req } from '@nestjs/common';
import { Public } from '../admin-auth/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { IsString, IsArray, IsOptional, IsNumber, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsString()
  productId!: string;

  @IsString()
  variantId!: string;

  @IsNumber()
  quantity!: number;
}

class CreatePayPalOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsString()
  @IsOptional()
  currency?: string;
}

class CapturePayPalOrderDto {
  @IsString()
  paypalOrderId!: string;

  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  country!: string;

  @IsString()
  @IsOptional()
  stateOrProvince?: string;

  @IsString()
  city!: string;

  @IsString()
  addressLine1!: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}

@Public()
@Controller('public/payments/paypal')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  async createOrder(@Body() dto: CreatePayPalOrderDto, @Req() req: any) {
    const customerId = req.session?.customerId || undefined;
    return this.paymentsService.createPayPalOrderFromCart({
      items: dto.items,
      currency: dto.currency,
      customerId,
    });
  }

  @Post('capture-order')
  async captureOrder(@Body() dto: CapturePayPalOrderDto, @Req() req: any) {
    const customerId = req.session?.customerId || undefined;
    return this.paymentsService.captureAndCreateOrder({
      paypalOrderId: dto.paypalOrderId,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      country: dto.country,
      stateOrProvince: dto.stateOrProvince,
      city: dto.city,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      postalCode: dto.postalCode,
      currency: dto.currency,
      customerId,
    });
  }
}
