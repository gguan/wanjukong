import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuditService } from './admin-audit.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentAdmin } from './decorators/current-admin.decorator';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private authService: AdminAuthService,
    private audit: AdminAuditService,
  ) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];

    const user = await this.authService.validateCredentials(
      dto.email,
      dto.password,
      ip,
      ua,
    );

    // Rotate session to prevent fixation
    await new Promise<void>((resolve, reject) => {
      const oldSession = req.session;
      oldSession.regenerate((err) => {
        if (err) return reject(err);
        // Restore session data after regeneration
        req.session.adminUserId = user.id;
        req.session.adminRole = user.role;
        resolve();
      });
    });

    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const adminUserId = req.session?.adminUserId;
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];

    await new Promise<void>((resolve) => {
      req.session.destroy(() => resolve());
    });

    if (adminUserId) {
      await this.audit.log({
        adminUserId,
        action: 'LOGOUT',
        ipAddress: ip,
        userAgent: ua,
      });
    }

    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: Request) {
    const adminUserId = req.session?.adminUserId;
    if (!adminUserId) {
      return null;
    }
    return this.authService.getProfile(adminUserId);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentAdmin() admin: { id: string },
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];

    await this.authService.changePassword(
      admin.id,
      dto.oldPassword,
      dto.newPassword,
      ip,
      ua,
    );

    return { ok: true };
  }
}
