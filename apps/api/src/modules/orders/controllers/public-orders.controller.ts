import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { OrdersService } from '../orders.service';
import { CreateBuyNowOrderDto } from '../dto/create-buy-now-order.dto';

@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('buy-now')
  createBuyNow(@Body() dto: CreateBuyNowOrderDto) {
    return this.ordersService.createBuyNow(dto);
  }

  @Get(':orderNo')
  findByOrderNo(@Param('orderNo') orderNo: string) {
    return this.ordersService.findByOrderNo(orderNo);
  }
}
