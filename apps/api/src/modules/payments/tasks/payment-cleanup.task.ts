import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsService } from '../payments.service';

/**
 * Periodically cleans up stale PaymentIntents that were never completed.
 * Releases reserved coupons and closes WeChat prepay orders.
 *
 * Runs every 5 minutes.
 */
@Injectable()
export class PaymentCleanupTask {
  private readonly logger = new Logger(PaymentCleanupTask.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Cron('*/5 * * * *')
  async handleCleanup() {
    try {
      const count = await this.paymentsService.cleanupStalePaymentIntents(30);
      if (count > 0) {
        this.logger.log(`Cleaned ${count} stale payment intents`);
      }
    } catch (err) {
      this.logger.error('Payment cleanup failed', err);
    }
  }
}
