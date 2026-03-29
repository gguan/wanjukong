import { Module } from '@nestjs/common';
import { StorefrontAuthController } from './storefront-auth.controller';
import { MiniProgramAuthController } from './controllers/miniprogram-auth.controller';
import { StorefrontAuthService } from './storefront-auth.service';
import { CustomerSessionAuthGuard } from './guards/customer-session-auth.guard';

@Module({
  controllers: [StorefrontAuthController, MiniProgramAuthController],
  providers: [StorefrontAuthService, CustomerSessionAuthGuard],
  exports: [StorefrontAuthService],
})
export class StorefrontAuthModule {}
