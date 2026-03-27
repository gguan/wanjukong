import { Controller, Get, Param } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { OrdersService } from '../orders.service';
import { Roles } from '../../admin-auth/decorators/roles.decorator';

@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
