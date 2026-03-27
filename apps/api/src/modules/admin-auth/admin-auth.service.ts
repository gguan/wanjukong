import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private audit: AdminAuditService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
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
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.audit.log({
        adminUserId: user.id,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'inactive_account' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
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
      throw new UnauthorizedException('Account temporarily locked. Try again later.');
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

      throw new UnauthorizedException('Invalid credentials');
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
      throw new UnauthorizedException('Admin not found');
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
      throw new UnauthorizedException('Admin not found');
    }

    const valid = await argon2.verify(user.passwordHash, oldPassword);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
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
