import { Controller, Post, Get, Param, Body, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../admin-auth/decorators/public.decorator';
import { OrdersService } from '../orders.service';
import { ValidateCouponDto } from '../dto/validate-coupon.dto';

@Public()
@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('validate-coupon')
  validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.ordersService.validateCoupon(dto.code, dto.subtotalCents);
  }

  /**
   * Lookup an order by its public-facing order number.
   *
   * Authorization (enforced by the service):
   *   - Logged-in customer whose session matches the order's customerId, OR
   *   - Guest with a valid access token (sent as ?token=... — issued at
   *     checkout-capture time, hashed in the DB).
   *
   * Anything else returns 404 to prevent enumeration.
   */
  @Get(':orderNo')
  findByOrderNo(
    @Param('orderNo') orderNo: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
  ) {
    const customerId: string | null = (req as unknown as { session?: { customerId?: string } })
      .session?.customerId ?? null;
    return this.ordersService.findByOrderNoAuthorized(
      orderNo,
      customerId,
      token ?? null,
    );
  }
}
