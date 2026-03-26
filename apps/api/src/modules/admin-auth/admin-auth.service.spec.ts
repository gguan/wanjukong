import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AdminAuthService } from './admin-auth.service';

// Mock PrismaService
function createMockPrisma() {
  return {
    adminUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

// Mock AdminAuditService
function createMockAudit() {
  return { log: vi.fn() };
}

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let audit: ReturnType<typeof createMockAudit>;

  beforeEach(() => {
    prisma = createMockPrisma();
    audit = createMockAudit();
    service = new AdminAuthService(prisma as any, audit as any);
  });

  describe('hashPassword', () => {
    it('should hash and verify a password', async () => {
      const hash = await service.hashPassword('testPassword123');
      expect(hash).not.toBe('testPassword123');
      expect(await argon2.verify(hash, 'testPassword123')).toBe(true);
    });
  });

  describe('validateCredentials', () => {
    const validHash = argon2.hash('correctPassword');

    async function makeUser(overrides = {}) {
      return {
        id: 'user-1',
        email: 'admin@test.com',
        passwordHash: await validHash,
        name: 'Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        ...overrides,
      };
    }

    it('should return user on correct credentials', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(await makeUser());
      prisma.adminUser.update.mockResolvedValue({});

      const result = await service.validateCredentials('admin@test.com', 'correctPassword');
      expect(result).toEqual({
        id: 'user-1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'SUPER_ADMIN',
      });
    });

    it('should reset failedAttempts on success', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(
        await makeUser({ failedAttempts: 3 }),
      );
      prisma.adminUser.update.mockResolvedValue({});

      await service.validateCredentials('admin@test.com', 'correctPassword');
      expect(prisma.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedAttempts: 0, lockedUntil: null }),
        }),
      );
    });

    it('should throw on wrong password', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(await makeUser());
      prisma.adminUser.update.mockResolvedValue({});

      await expect(
        service.validateCredentials('admin@test.com', 'wrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should increment failedAttempts on wrong password', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(
        await makeUser({ failedAttempts: 2 }),
      );
      prisma.adminUser.update.mockResolvedValue({});

      await expect(
        service.validateCredentials('admin@test.com', 'wrongPassword'),
      ).rejects.toThrow();

      expect(prisma.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedAttempts: 3 }),
        }),
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(
        await makeUser({ failedAttempts: 4 }),
      );
      prisma.adminUser.update.mockResolvedValue({});

      await expect(
        service.validateCredentials('admin@test.com', 'wrongPassword'),
      ).rejects.toThrow();

      expect(prisma.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            failedAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw on unknown email', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.validateCredentials('nobody@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on inactive account', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(
        await makeUser({ isActive: false }),
      );

      await expect(
        service.validateCredentials('admin@test.com', 'correctPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on locked account', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(
        await makeUser({ lockedUntil: new Date(Date.now() + 60000) }),
      );

      await expect(
        service.validateCredentials('admin@test.com', 'correctPassword'),
      ).rejects.toThrow('Account temporarily locked');
    });

    it('should log audit events', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(await makeUser());
      prisma.adminUser.update.mockResolvedValue({});

      await service.validateCredentials('admin@test.com', 'correctPassword', '127.0.0.1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGIN_SUCCESS', adminUserId: 'user-1' }),
      );
    });
  });
});
