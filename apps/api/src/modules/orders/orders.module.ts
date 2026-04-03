import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PublicOrdersController } from './controllers/public-orders.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [PublicOrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
