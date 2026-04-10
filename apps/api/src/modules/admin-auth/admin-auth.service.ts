import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AdminAuditService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  /**
   * Verify Tencent Cloud Captcha (TCaptcha).
   * Calls DescribeCaptchaResult API to validate ticket + randstr.
   * Skips verification if TCAPTCHA_APP_ID is not configured (dev mode).
   */
  async verifyCaptcha(ticket: string, randstr: string, userIp?: string): Promise<void> {
    const captchaAppId = process.env.TCAPTCHA_APP_ID;
    const secretId = process.env.TENCENT_COS_SECRET_ID;
    const secretKey = process.env.TENCENT_COS_SECRET_KEY;

    if (!captchaAppId) {
      this.logger.warn('TCAPTCHA_APP_ID not configured — skipping captcha verification');
      return;
    }
    if (!secretId || !secretKey) {
      this.logger.warn('Tencent Cloud credentials not configured — skipping captcha');
      return;
    }

    // Tencent Cloud API v3 signature
    const service = 'captcha';
    const host = 'captcha.tencentcloudapi.com';
    const action = 'DescribeCaptchaResult';
    const version = '2019-07-22';
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

    const payload = JSON.stringify({
      CaptchaType: 9,
      Ticket: ticket,
      UserIp: userIp || '127.0.0.1',
      Randstr: randstr,
      CaptchaAppId: Number(captchaAppId),
      AppSecretKey: process.env.TCAPTCHA_APP_SECRET_KEY || '',
    });

    // TC3-HMAC-SHA256 signing
    const crypto = await import('crypto');
    const sha256 = (data: string) => crypto.createHash('sha256').update(data).digest('hex');
    const hmacSha256 = (key: Buffer, data: string) =>
      crypto.createHmac('sha256', key).update(data).digest();

    const httpMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
    const signedHeaders = 'content-type;host;x-tc-action';
    const hashedPayload = sha256(payload);
    const canonicalRequest = `${httpMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

    const credentialScope = `${date}/${service}/tc3_request`;
    const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256(canonicalRequest)}`;

    const secretDate = hmacSha256(Buffer.from(`TC3${secretKey}`, 'utf-8'), date);
    const secretService = hmacSha256(secretDate, service);
    const secretSigning = hmacSha256(secretService, 'tc3_request');
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`https://${host}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Host: host,
          'X-TC-Action': action,
          'X-TC-Version': version,
          'X-TC-Timestamp': String(timestamp),
          Authorization: authorization,
        },
        body: payload,
        signal: controller.signal,
      });

      const data = await res.json() as {
        Response: {
          CaptchaCode: number;
          CaptchaMsg: string;
          Error?: { Code: string; Message: string };
        };
      };

      if (data.Response.Error) {
        this.logger.error('TCaptcha API error', data.Response.Error);
        throw new BadRequestException('验证码服务异常，请稍后再试');
      }

      // CaptchaCode: 1 = OK, other = failed
      if (data.Response.CaptchaCode !== 1) {
        this.logger.warn(`TCaptcha failed: ${data.Response.CaptchaMsg}`);
        throw new BadRequestException('验证码验证失败，请重试');
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new BadRequestException('验证码服务超时，请重试');
      }
      if (err instanceof BadRequestException) throw err;
      this.logger.error('TCaptcha verification error', err);
      throw new BadRequestException('验证码验证失败');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async validateCredentials(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Generic error — do not reveal whether email exists
    if (!user) {
      await this.audit.log({
        action: 'LOGIN_FAILED',
        metadata: { reason: 'unknown_email', email },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('账号或密码错误');
    }

    if (!user.isActive) {
      await this.audit.log({
        adminUserId: user.id,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'inactive_account' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('账号或密码错误');
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log({
        adminUserId: user.id,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'account_locked' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('账号已被临时锁定，请稍后再试');
    }

    // Verify password
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      const newAttempts = user.failedAttempts + 1;
      const updateData: Record<string, unknown> = {
        failedAttempts: newAttempts,
      };

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.audit.log({
          adminUserId: user.id,
          action: 'ACCOUNT_LOCKED',
          metadata: { failedAttempts: newAttempts },
          ipAddress,
          userAgent,
        });
      }

      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: updateData,
      });

      await this.audit.log({
        adminUserId: user.id,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'wrong_password', failedAttempts: newAttempts },
        ipAddress,
        userAgent,
      });

      throw new UnauthorizedException('账号或密码错误');
    }

    // Success — reset counters
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await this.audit.log({
      adminUserId: user.id,
      action: 'LOGIN_SUCCESS',
      ipAddress,
      userAgent,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async getProfile(adminUserId: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        lastLoginAt: true,
        brandAssignments: {
          select: {
            brandId: true,
            brand: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('管理员不存在');
    }

    return user;
  }

  async changePassword(
    adminUserId: string,
    oldPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
    });

    if (!user) {
      throw new UnauthorizedException('管理员不存在');
    }

    const valid = await argon2.verify(user.passwordHash, oldPassword);
    if (!valid) {
      throw new UnauthorizedException('当前密码不正确');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.prisma.adminUser.update({
      where: { id: adminUserId },
      data: { passwordHash },
    });

    await this.audit.log({
      adminUserId,
      action: 'PASSWORD_CHANGED',
      ipAddress,
      userAgent,
    });
  }
}
