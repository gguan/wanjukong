import { describe, it, expect, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SessionAuthGuard } from './session-auth.guard';

function createMockContext(overrides: {
  session?: Record<string, unknown>;
  url?: string;
}) {
  const request = {
    session: overrides.session || {},
    originalUrl: overrides.url || '/api/admin/products',
    url: overrides.url || '/api/admin/products',
  };

  const controllerClass = function () {};

  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => controllerClass,
    request,
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

describe('SessionAuthGuard (deny-by-default)', () => {
  it('allows routes explicitly marked @Public()', async () => {
    const guard = createGuard({ isPublic: true });
    const ctx = createMockContext({ session: {} });
    expect(await guard.canActivate(ctx as any)).toBe(true);
  });

  it('rejects non-@Public routes when no admin session is present — even on non-admin paths', async () => {
    // The whole point of deny-by-default: path prefix no longer grants access.
    const guard = createGuard({ isPublic: false });
    const ctx = createMockContext({
      url: '/api/public/brands',
      session: {},
    });
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects admin routes without session', async () => {
    const guard = createGuard({ isPublic: false });
    const ctx = createMockContext({
      url: '/api/admin/products',
      session: {},
    });
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException);
  });

  it('allows admin routes with a valid session', async () => {
    const guard = createGuard();
    const ctx = createMockContext({
      url: '/api/admin/products',
      session: { adminUserId: 'u1', adminRole: 'ADMIN' },
    });
    expect(await guard.canActivate(ctx as any)).toBe(true);
    expect((ctx as any).request.adminUser).toBeDefined();
  });

  it('rejects if the admin user is inactive', async () => {
    const guard = createGuard({
      adminUser: { id: 'u1', email: 'a@b.com', name: 'Admin', role: 'ADMIN', isActive: false },
    });
    const ctx = createMockContext({
      url: '/api/admin/products',
      session: { adminUserId: 'u1' },
    });
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException);
  });
});
