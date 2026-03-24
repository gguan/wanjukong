import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PublicOrdersController } from './controllers/public-orders.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';

@Module({
  controllers: [PublicOrdersController, AdminOrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
