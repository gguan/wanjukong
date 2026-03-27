import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CustomerSessionAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const customerId = request.session?.customerId;

    if (!customerId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!customer || !customer.isActive) {
      request.session.customerId = undefined;
      throw new UnauthorizedException('Account not found or inactive');
    }

    request.customer = customer;
    return true;
  }
}
