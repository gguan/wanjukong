import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaypalProvider } from './providers/paypal.provider';
import { WechatPayProvider } from './providers/wechat-pay.provider';
import { PaypalController } from './controllers/paypal.controller';
import { WechatPayController } from './controllers/wechat-pay.controller';
import { PaymentCleanupTask } from './tasks/payment-cleanup.task';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  controllers: [PaypalController, WechatPayController],
  providers: [PaymentsService, PaypalProvider, WechatPayProvider, PaymentCleanupTask],
  exports: [PaymentsService],
})
export class PaymentsModule {}
