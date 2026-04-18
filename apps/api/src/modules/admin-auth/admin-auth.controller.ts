import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
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
  private readonly logger = new Logger(AdminAuthController.name);

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

    // Rotate session to prevent fixation. We explicitly save() after
    // regenerate so the store write is durable before we return — without
    // this, express-session's implicit end-of-response save can race with
    // the Set-Cookie header, and the next request finds a cookie whose
    // session row isn't in Postgres yet (observed as an immediate 401 on
    // the dashboard right after a successful login).
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        req.session.adminUserId = user.id;
        req.session.adminRole = user.role;
        req.session.save((saveErr) => {
          if (saveErr) return reject(saveErr);
          resolve();
        });
      });
    });

    // DIAGNOSTIC: log the factors that decide whether express-session
    // will emit Set-Cookie on this response. If `secure` is true but
    // `reqSecure` is false, the browser never receives the cookie and
    // every subsequent request comes in unauthenticated. Remove once
    // the production login regression is root-caused.
    this.logger.log(
      `login-diag sid=${req.sessionID?.slice(0, 8)}… ` +
        `reqSecure=${(req as Request).secure} ` +
        `xfp=${req.headers['x-forwarded-proto']} ` +
        `proto=${(req as Request).protocol} ` +
        `trustProxy=${req.app?.get('trust proxy fn') ? 'fn' : req.app?.get('trust proxy')} ` +
        `cookieSecure=${req.session.cookie.secure} ` +
        `cookieSameSite=${req.session.cookie.sameSite}`,
    );

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
