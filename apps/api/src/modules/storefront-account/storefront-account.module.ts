import { Module } from '@nestjs/common';
import { StorefrontAccountController } from './storefront-account.controller';
import { StorefrontAccountService } from './storefront-account.service';

@Module({
  controllers: [StorefrontAccountController],
  providers: [StorefrontAccountService],
})
export class StorefrontAccountModule {}
