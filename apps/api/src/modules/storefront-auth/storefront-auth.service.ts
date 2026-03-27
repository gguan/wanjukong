import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
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
