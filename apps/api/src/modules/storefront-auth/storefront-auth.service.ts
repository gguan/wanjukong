import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class StorefrontAuthService {
  private readonly logger = new Logger(StorefrontAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  async register(dto: RegisterCustomerDto) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password);

    const customer = await this.prisma.customer.create({
      data: {
        email,
        passwordHash,
        name: dto.name ?? null,
      },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.customerEmailVerification.create({
      data: {
        customerId: customer.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.mailerService.sendVerificationEmail(
      customer.email,
      customer.name,
      token,
    );

    return {
      customer: this.sanitizeCustomer(customer),
      verificationRequired: true,
    };
  }

  async login(dto: LoginCustomerDto, session: Record<string, any>) {
    const email = dto.email.toLowerCase().trim();

    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (customer.lockedUntil && customer.lockedUntil > new Date()) {
      throw new ForbiddenException(
        'Account temporarily locked. Please try again later.',
      );
    }

    const passwordValid = await argon2.verify(
      customer.passwordHash,
      dto.password,
    );

    if (!passwordValid) {
      const failedAttempts = customer.failedAttempts + 1;
      const updateData: Record<string, any> = { failedAttempts };

      if (failedAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await this.prisma.customer.update({
        where: { id: customer.id },
        data: updateData,
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    session.customerId = customer.id;

    return { customer: this.sanitizeCustomer(customer) };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const verification =
      await this.prisma.customerEmailVerification.findFirst({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.customerEmailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.customer.update({
        where: { id: verification.customerId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);

    return { verified: true };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const customer = await this.prisma.customer.findUnique({
      where: { email: normalizedEmail },
    });

    if (customer && !customer.emailVerifiedAt) {
      // Invalidate old tokens
      await this.prisma.customerEmailVerification.updateMany({
        where: { customerId: customer.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      await this.prisma.customerEmailVerification.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await this.mailerService.sendVerificationEmail(
        customer.email,
        customer.name,
        token,
      );
    }

    // Always return success to prevent email enumeration
    return { message: 'If the email exists, a verification link has been sent.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();

    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });

    if (customer) {
      // Invalidate old resets
      await this.prisma.customerPasswordReset.updateMany({
        where: { customerId: customer.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      await this.prisma.customerPasswordReset.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await this.mailerService.sendPasswordResetEmail(
        customer.email,
        customer.name,
        token,
      );
    }

    // Always return success to prevent email enumeration
    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const reset = await this.prisma.customerPasswordReset.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!reset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: reset.customerId },
        data: { passwordHash },
      }),
      this.prisma.customerPasswordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { reset: true };
  }

  async getMe(session: Record<string, any>) {
    const customerId = session?.customerId;

    if (!customerId) {
      return null;
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return null;
    }

    return this.sanitizeCustomer(customer);
  }

  logout(session: Record<string, any>) {
    delete session.customerId;
    return { loggedOut: true };
  }

  // ─── WeChat Mini Program ────────────────────────────────

  /**
   * Exchange a wx.login() code for a session.
   * Upserts a Customer record keyed by wechatOpenId.
   * First-time users get a placeholder email; they can add a real email later.
   */
  async wechatLogin(code: string, session: Record<string, any>) {
    const openid = await this.exchangeWechatCode(code);

    let customer = await this.prisma.customer.findUnique({
      where: { wechatOpenId: openid },
    });

    if (!customer) {
      // Auto-register: placeholder email + random unusable password
      const placeholderEmail = `wechat_${openid}@wechat.internal`;
      const placeholderHash = crypto.randomBytes(32).toString('hex');

      customer = await this.prisma.customer.create({
        data: {
          wechatOpenId: openid,
          authProvider: 'wechat',
          email: placeholderEmail,
          passwordHash: placeholderHash,
          isActive: true,
        },
      });
    }

    if (!customer.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });

    session.customerId = customer.id;

    return { customer: this.sanitizeCustomer(customer) };
  }

  // ─── WeChat Access Token (cached) ──────────────────────

  private wechatAccessToken: { value: string; expiresAt: number } | null = null;

  private async getWechatAccessToken(): Promise<string> {
    if (
      this.wechatAccessToken &&
      this.wechatAccessToken.expiresAt > Date.now() + 60_000
    ) {
      return this.wechatAccessToken.value;
    }

    const appId = process.env.WECHAT_PAY_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    if (!appId || !appSecret) {
      throw new InternalServerErrorException(
        'WeChat login is not configured on this server',
      );
    }

    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`,
    );
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      errcode?: number;
      errmsg?: string;
    };

    if (!data.access_token) {
      throw new InternalServerErrorException(
        `Failed to get WeChat access_token: ${data.errmsg}`,
      );
    }

    this.wechatAccessToken = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 7200) * 1000,
    };

    return this.wechatAccessToken.value;
  }

  // ─── Bind Phone ─────────────────────────────────────────

  /**
   * Exchange a getPhoneNumber code for the user's real phone number
   * and persist it on their Customer record.
   *
   * Mini program flow:
   *   <button open-type="getPhoneNumber" bindgetphonenumber="onGetPhone">
   *   onGetPhone(e) → send e.detail.code to this endpoint
   */
  async bindWechatPhone(customerId: string, code: string) {
    const accessToken = await this.getWechatAccessToken();

    const res = await fetch(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      },
    );

    const data = (await res.json()) as {
      errcode?: number;
      errmsg?: string;
      phone_info?: {
        phoneNumber: string;
        purePhoneNumber: string;
        countryCode: string;
      };
    };

    if (data.errcode || !data.phone_info) {
      this.logger.warn(
        `WeChat getuserphonenumber failed: ${data.errmsg} (${data.errcode})`,
      );
      throw new BadRequestException('Failed to retrieve phone number from WeChat');
    }

    const { countryCode, purePhoneNumber } = data.phone_info;
    const phone = `+${countryCode}${purePhoneNumber}`;

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { phone },
    });

    return { phone };
  }

  private async exchangeWechatCode(code: string): Promise<string> {
    const appId = process.env.WECHAT_PAY_APP_ID;
    const appSecret = process.env.WECHAT_APP_SECRET;

    if (!appId || !appSecret) {
      throw new InternalServerErrorException(
        'WeChat login is not configured on this server',
      );
    }

    const url =
      `https://api.weixin.qq.com/sns/jscode2session` +
      `?appid=${appId}&secret=${appSecret}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;

    const res = await fetch(url);
    const data = (await res.json()) as {
      openid?: string;
      session_key?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode || !data.openid) {
      this.logger.warn(`WeChat code exchange failed: ${data.errmsg} (${data.errcode})`);
      throw new UnauthorizedException('Invalid or expired WeChat login code');
    }

    return data.openid;
  }

  private sanitizeCustomer(customer: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    emailVerifiedAt: Date | null;
  }) {
    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      emailVerifiedAt: customer.emailVerifiedAt,
    };
  }
}
