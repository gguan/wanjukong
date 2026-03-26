import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

function createGuard(options: { isPublic?: boolean; requiredRoles?: string[] | null }) {
  const reflector = {
    getAllAndOverride: vi.fn().mockImplementation((key: string) => {
      if (key === 'isPublic') return options.isPublic || false;
      if (key === 'roles') return options.requiredRoles ?? null;
      return null;
    }),
  };
  return new RolesGuard(reflector as any);
}

function createContext(session: Record<string, unknown> = {}, adminUser?: unknown) {
  const request = { session, adminUser };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe('RolesGuard', () => {
  it('should allow public routes', () => {
    const guard = createGuard({ isPublic: true, requiredRoles: ['SUPER_ADMIN'] });
    expect(guard.canActivate(createContext() as any)).toBe(true);
  });

  it('should allow any authenticated admin when no @Roles() is set', () => {
    const guard = createGuard({ requiredRoles: null });
    expect(guard.canActivate(createContext({ adminRole: 'EDITOR' }) as any)).toBe(true);
  });

  it('should allow when role matches', () => {
    const guard = createGuard({ requiredRoles: ['ADMIN', 'SUPER_ADMIN'] });
    expect(
      guard.canActivate(createContext({ adminRole: 'ADMIN' }) as any),
    ).toBe(true);
  });

  it('should reject when role does not match', () => {
    const guard = createGuard({ requiredRoles: ['SUPER_ADMIN'] });
    expect(() =>
      guard.canActivate(createContext({ adminRole: 'EDITOR' }) as any),
    ).toThrow(ForbiddenException);
  });

  it('should fallback to adminUser.role if session role missing', () => {
    const guard = createGuard({ requiredRoles: ['ADMIN'] });
    expect(
      guard.canActivate(createContext({}, { role: 'ADMIN' }) as any),
    ).toBe(true);
  });
});
