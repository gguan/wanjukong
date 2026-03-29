import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { Public } from '../../admin-auth/decorators/public.decorator';
import { OrdersService } from '../orders.service';
import { CreateBuyNowOrderDto } from '../dto/create-buy-now-order.dto';
import { CreateCartOrderDto } from '../dto/create-cart-order.dto';
import { ValidateCouponDto } from '../dto/validate-coupon.dto';

@Public()
@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('validate-coupon')
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.ordersService.validateCoupon(dto.code, dto.subtotalCents);
  }

  @Post('buy-now')
  createBuyNow(@Body() dto: CreateBuyNowOrderDto) {
    return this.ordersService.createBuyNow(dto);
  }

  @Post('cart')
  createCartOrder(@Body() dto: CreateCartOrderDto) {
    return this.ordersService.createCartOrder(dto);
  }

  @Get(':orderNo')
  findByOrderNo(
    @Param('orderNo') orderNo: string,
    @Query('token') token?: string,
  ) {
    if (token) {
      return this.ordersService.findGuestOrderByOrderNoAndToken(
        orderNo,
        token,
      );
    }
    return this.ordersService.findByOrderNo(orderNo);
  }
}
