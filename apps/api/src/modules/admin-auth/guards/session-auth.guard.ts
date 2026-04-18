import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Global admin session guard — deny-by-default.
 *
 * Every route is protected by this guard unless it is explicitly marked
 * `@Public()` at the controller or handler level. Public storefront,
 * webhook, and miniprogram routes must opt out with `@Public()`; anything
 * that isn't annotated requires an active admin session.
 *
 * Prior implementation used a path-prefix heuristic (`/admin/` → protected,
 * everything else → pass) which was fragile: a future controller registered
 * without `admin/` in its path silently escaped auth. Deny-by-default shifts
 * the safety default so that any refactor that forgets to annotate a
 * controller fails closed instead of silently opening a hole.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Explicit opt-out via @Public() — at method or class level.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const adminUserId = request.session?.adminUserId;
    if (!adminUserId) {
      throw new UnauthorizedException('请先登录');
    }

    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        brandAssignments: { select: { brandId: true } },
      },
    });

    if (!adminUser || !adminUser.isActive) {
      // Session references a deleted or deactivated admin — purge the cookie.
      if (typeof request.session.destroy === 'function') {
        request.session.destroy(() => {});
      }
      throw new UnauthorizedException('请先登录');
    }

    request.adminUser = adminUser;
    return true;
  }
}
