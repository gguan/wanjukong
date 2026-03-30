import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Roles } from '../admin-auth/decorators/roles.decorator';
import { ShipmentsService } from './shipments.service';

@Roles(AdminRole.SUPER_ADMIN, AdminRole.ADMIN, AdminRole.EDITOR)
@Controller('admin/orders/:orderId/shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  findByOrder(@Param('orderId') orderId: string) {
    return this.shipmentsService.findByOrder(orderId);
  }

  @Post()
  create(
    @Param('orderId') orderId: string,
    @Body()
    dto: {
      carrier: string;
      carrierName?: string;
      trackingNumber: string;
      isInternational?: boolean;
      estimatedDeliveryAt?: string;
      notes?: string;
      items?: Array<{ orderItemId: string; quantity: number }>;
    },
  ) {
    return this.shipmentsService.create({ orderId, ...dto });
  }

  @Patch(':shipmentId')
  update(
    @Param('shipmentId') shipmentId: string,
    @Body()
    dto: {
      carrier?: string;
      carrierName?: string;
      trackingNumber?: string;
      status?: string;
      isInternational?: boolean;
      estimatedDeliveryAt?: string;
      notes?: string;
    },
  ) {
    return this.shipmentsService.update(shipmentId, dto);
  }

  @Delete(':shipmentId')
  remove(@Param('shipmentId') shipmentId: string) {
    return this.shipmentsService.remove(shipmentId);
  }
}
