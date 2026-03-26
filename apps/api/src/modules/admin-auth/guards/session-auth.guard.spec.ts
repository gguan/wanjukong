import { describe, it, expect, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SessionAuthGuard } from './session-auth.guard';

function createMockContext(overrides: {
  session?: Record<string, unknown>;
  controllerPath?: string;
  url?: string;
  isPublic?: boolean;
}) {
  const request = {
    session: overrides.session || {},
    originalUrl: overrides.url || '/api/admin/products',
    url: overrides.url || '/api/admin/products',
  };

  const controllerClass = function () {};
  // Simulate NestJS controller metadata
  Reflect.defineMetadata('path', overrides.controllerPath ?? 'admin/products', controllerClass);

  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => controllerClass,
    request,
    isPublic: overrides.isPublic,
  };
}

function createGuard(overrides: { isPublic?: boolean; adminUser?: unknown } = {}) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(overrides.isPublic || false),
  };
  const prisma = {
    adminUser: {
      findUnique: vi.fn().mockResolvedValue(
        overrides.adminUser !== undefined
          ? overrides.adminUser
          : { id: 'u1', email: 'a@b.com', name: 'Admin', role: 'ADMIN', isActive: true },
      ),
    },
  };
  return new SessionAuthGuard(reflector as any, prisma as any);
}

describe('SessionAuthGuard', () => {
  it('should allow public routes', async () => {
    const guard = createGuard({ isPublic: true });
    const ctx = createMockContext({ session: {} });
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  it('should allow non-admin routes without session', async () => {
    const guard = createGuard({ isPublic: false });
    const ctx = createMockContext({
      controllerPath: 'public/brands',
      url: '/api/public/brands',
      session: {},
    });
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  it('should reject admin routes without session', async () => {
    const guard = createGuard({ isPublic: false });
    const ctx = createMockContext({
      controllerPath: 'admin/products',
      url: '/api/admin/products',
      session: {},
    });
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow admin routes with valid session', async () => {
    const guard = createGuard();
    const ctx = createMockContext({
      controllerPath: 'admin/products',
      url: '/api/admin/products',
      session: { adminUserId: 'u1', adminRole: 'ADMIN' },
    });
    expect(await guard.canActivate(ctx as any)).toBe(true);
    expect((ctx as any).request.adminUser).toBeDefined();
  });

  it('should reject if admin user is inactive', async () => {
    const guard = createGuard({
      adminUser: { id: 'u1', email: 'a@b.com', name: 'Admin', role: 'ADMIN', isActive: false },
    });
    const ctx = createMockContext({
      controllerPath: 'admin/products',
      url: '/api/admin/products',
      session: { adminUserId: 'u1' },
    });
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException);
  });
});
