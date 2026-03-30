import { Controller, Get, Param, Patch, Body, Query, Req } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { OrdersService } from '../orders.service';
import { Roles } from '../../admin-auth/decorators/roles.decorator';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from '../dto/update-payment-status.dto';

@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR, AdminRole.BRAND_MANAGER)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Extract brandIds from request if user is BRAND_MANAGER.
   * Returns undefined for other roles (= no filtering).
   */
  private getBrandIds(req: any): string[] | undefined {
    const admin = req.adminUser;
    if (admin?.role !== AdminRole.BRAND_MANAGER) return undefined;
    return (admin.brandAssignments || []).map(
      (a: { brandId: string }) => a.brandId,
    );
  }

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.ordersService.getDashboardStats(this.getBrandIds(req));
  }

  @Get('stats')
  getStats() {
    return this.ordersService.getOrderStats();
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.ordersService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search: search || undefined,
      status: status || undefined,
      paymentStatus: paymentStatus || undefined,
      brandIds: this.getBrandIds(req),
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.findOne(id, this.getBrandIds(req));
  }

  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto.status);
  }

  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR)
  @Patch(':id/payment-status')
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(id, dto.paymentStatus);
  }
}
