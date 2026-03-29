import { Module } from '@nestjs/common';
import { StorefrontAuthController } from './storefront-auth.controller';
import { MiniProgramAuthController } from './controllers/miniprogram-auth.controller';
import { StorefrontAuthService } from './storefront-auth.service';

@Module({
  controllers: [StorefrontAuthController, MiniProgramAuthController],
  providers: [StorefrontAuthService],
  exports: [StorefrontAuthService],
})
export class StorefrontAuthModule {}
