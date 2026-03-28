import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if @Public() decorator is present
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // Check controller path to determine if this is an admin route.
    // NestJS controller metadata is more reliable than request URL.
    const controllerPath = Reflect.getMetadata('path', context.getClass()) || '';
    const url = request.originalUrl || request.url || '';

    // Only protect admin/* routes — public storefront routes pass through
    const isAdminRoute =
      controllerPath.startsWith('admin') ||
      controllerPath.startsWith('/admin') ||
      url.includes('/admin/');

    if (!isAdminRoute) {
      return true;
    }

    const adminUserId = request.session?.adminUserId;
    if (!adminUserId) {
      throw new UnauthorizedException('请先登录');
    }

    // Attach admin user to request for downstream use
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
      // Session references a deleted or deactivated admin
      if (typeof request.session.destroy === 'function') {
        request.session.destroy(() => {});
      }
      throw new UnauthorizedException('请先登录');
    }

    request.adminUser = adminUser;
    return true;
  }
}
