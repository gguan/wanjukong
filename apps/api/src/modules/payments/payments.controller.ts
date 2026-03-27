import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Public } from '../admin-auth/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { OrdersService } from '../orders/orders.service';

class CartItemDto {
  productId!: string;
  variantId!: string;
  quantity!: number;
}

class CreatePayPalOrderDto {
  items!: CartItemDto[];
  currency?: string;
}

class CapturePayPalOrderDto {
  paypalOrderId!: string;
  items!: CartItemDto[];
  fullName!: string;
  email!: string;
  phone?: string;
  country!: string;
  stateOrProvince?: string;
  city!: string;
  addressLine1!: string;
  addressLine2?: string;
  postalCode?: string;
  currency?: string;
}

@Public()
@Controller('public/payments/paypal')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Post('create-order')
  async createOrder(@Body() dto: CreatePayPalOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    return this.paymentsService.createPayPalOrderFromCart(dto.items, dto.currency);
  }

  @Post('capture-order')
  async captureOrder(@Body() dto: CapturePayPalOrderDto) {
    // 1. Capture payment with PayPal
    await this.paymentsService.capturePayPalOrder(dto.paypalOrderId);

    // 2. Create the DB order (with PAID status since PayPal captured)
    const order = await this.ordersService.createCartOrder({
      items: dto.items,
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
      paypalOrderId: dto.paypalOrderId,
    });

    return { orderNo: order.orderNo };
  }
}
