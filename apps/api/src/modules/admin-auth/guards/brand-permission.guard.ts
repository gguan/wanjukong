import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BrandPermissionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const adminUser = request.adminUser;

    // Non-BRAND_MANAGER users have full access
    if (!adminUser || adminUser.role !== AdminRole.BRAND_MANAGER) {
      return true;
    }

    const allowedBrandIds = (adminUser.brandAssignments || []).map(
      (a: { brandId: string }) => a.brandId,
    );

    // Attach for downstream use (e.g. filtering product list)
    request.allowedBrandIds = allowedBrandIds;

    const method = request.method;
    const productId = request.params?.id;

    // For list requests, filtering is handled by the controller
    if (method === 'GET' && !productId) {
      return true;
    }

    // For create: verify brandId in body
    if (method === 'POST' && !productId) {
      const brandId = request.body?.brandId;
      if (!brandId || !allowedBrandIds.includes(brandId)) {
        throw new ForbiddenException('You do not have permission for this brand');
      }
      return true;
    }

    // For single product operations (GET/PUT/DELETE :id)
    if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { brandId: true },
      });

      if (!product) {
        // Let the service handle 404
        return true;
      }

      if (!allowedBrandIds.includes(product.brandId)) {
        throw new ForbiddenException('You do not have permission for this brand');
      }

      // For update: also check if they're trying to change brandId to a non-allowed brand
      if (method === 'PUT' || method === 'PATCH') {
        const newBrandId = request.body?.brandId;
        if (newBrandId && !allowedBrandIds.includes(newBrandId)) {
          throw new ForbiddenException('You do not have permission for the target brand');
        }
      }
    }

    return true;
  }
}
