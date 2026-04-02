import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaypalProvider } from './providers/paypal.provider';
import { WechatPayProvider } from './providers/wechat-pay.provider';
import { PaypalController } from './controllers/paypal.controller';
import { WechatPayController } from './controllers/wechat-pay.controller';
import { PaymentCleanupTask } from './tasks/payment-cleanup.task';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaypalController, WechatPayController],
  providers: [PaymentsService, PaypalProvider, WechatPayProvider, PaymentCleanupTask],
})
export class PaymentsModule {}
