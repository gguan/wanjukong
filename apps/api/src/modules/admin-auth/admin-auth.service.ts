import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  /** In-memory captcha store: id → { code, expiresAt } */
  private captchaStore = new Map<string, { code: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private audit: AdminAuditService,
  ) {
    // Clean up expired captchas every minute
    setInterval(() => {
      const now = Date.now();
      for (const [id, entry] of this.captchaStore) {
        if (entry.expiresAt < now) this.captchaStore.delete(id);
      }
    }, 60_000);
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  // ─── SVG Captcha ──────────────────────────────────────

  /**
   * Generate a captcha: returns { id, svg }.
   * The SVG contains a 4-character code rendered with noise lines.
   */
  generateCaptcha(): { id: string; svg: string } {
    // Generate random 4-char code
    const code = Array.from({ length: 4 }, () =>
      CAPTCHA_CHARS[crypto.randomInt(CAPTCHA_CHARS.length)],
    ).join('');

    const id = crypto.randomBytes(16).toString('hex');
    this.captchaStore.set(id, {
      code,
      expiresAt: Date.now() + CAPTCHA_TTL_MS,
    });

    const svg = this.renderCaptchaSvg(code);
    return { id, svg };
  }

  /**
   * Verify a captcha code. Consumes the captcha (one-time use).
   */
  verifyCaptchaCode(captchaId: string, captchaCode: string): void {
    const entry = this.captchaStore.get(captchaId);

    if (!entry) {
      throw new BadRequestException('验证码已过期，请刷新');
    }

    // Always consume — one-time use
    this.captchaStore.delete(captchaId);

    if (entry.expiresAt < Date.now()) {
      throw new BadRequestException('验证码已过期，请刷新');
    }

    if (entry.code.toUpperCase() !== captchaCode.toUpperCase()) {
      throw new BadRequestException('验证码错误');
    }
  }

  /**
   * Render a 4-char code as SVG with noise lines and character transforms.
   */
  private renderCaptchaSvg(code: string): string {
    const width = 150;
    const height = 50;
    const chars = code.split('');

    // Random color
    const randColor = () => {
      const r = crypto.randomInt(40, 150);
      const g = crypto.randomInt(40, 150);
      const b = crypto.randomInt(40, 150);
      return `rgb(${r},${g},${b})`;
    };

    // Characters
    const charSvgs = chars.map((ch, i) => {
      const x = 15 + i * 32 + crypto.randomInt(-3, 4);
      const y = 30 + crypto.randomInt(-5, 6);
      const rotate = crypto.randomInt(-20, 21);
      const color = randColor();
      const fontSize = 26 + crypto.randomInt(-2, 4);
      return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="monospace" font-weight="bold" fill="${color}" transform="rotate(${rotate},${x},${y})">${ch}</text>`;
    }).join('');

    // Noise lines
    const lines = Array.from({ length: 5 }, () => {
      const x1 = crypto.randomInt(0, width);
      const y1 = crypto.randomInt(0, height);
      const x2 = crypto.randomInt(0, width);
      const y2 = crypto.randomInt(0, height);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${randColor()}" stroke-width="1" opacity="0.5"/>`;
    }).join('');

    // Noise dots
    const dots = Array.from({ length: 30 }, () => {
      const cx = crypto.randomInt(0, width);
      const cy = crypto.randomInt(0, height);
      return `<circle cx="${cx}" cy="${cy}" r="1" fill="${randColor()}" opacity="0.5"/>`;
    }).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f8f8f8"/>${lines}${dots}${charSvgs}</svg>`;
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
