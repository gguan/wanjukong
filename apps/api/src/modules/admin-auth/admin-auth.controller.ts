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
import { CaptchaService } from './captcha.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from './decorators/public.decorator';
import { CurrentAdmin } from './decorators/current-admin.decorator';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private authService: AdminAuthService,
    private audit: AdminAuditService,
    private captcha: CaptchaService,
  ) {}

  /**
   * Issue a new SVG captcha challenge. Client renders `svg` inline and sends
   * `id` + user-typed answer back with the login request.
   */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @Get('captcha')
  getCaptcha() {
    return this.captcha.generate();
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];

    // Verify captcha BEFORE touching the password store. Captcha is
    // single-use per entry — a failed password attempt still consumes the
    // challenge so the next login attempt needs a fresh one.
    this.captcha.verify(dto.captchaId, dto.captchaAnswer);

    const user = await this.authService.validateCredentials(
      dto.email,
      dto.password,
      ip,
      ua,
    );

    // Rotate session to prevent fixation. Do NOT call session.save()
    // explicitly here — express-session's response-end hook performs the
    // save implicitly before flushing the body, and explicit save() resets
    // the modified flag, causing shouldSetCookie() to skip Set-Cookie for
    // the freshly regenerated SID.
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
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

  @Public()
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
