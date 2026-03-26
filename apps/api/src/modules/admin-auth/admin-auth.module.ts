import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuditService } from './admin-audit.service';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminAuditService,
    // Global guards — order matters: session first, then roles
    {
      provide: APP_GUARD,
      useClass: SessionAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AdminAuthService, AdminAuditService],
})
export class AdminAuthModule {}
