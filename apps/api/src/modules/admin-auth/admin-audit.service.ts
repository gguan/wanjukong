import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogParams {
  adminUserId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AdminAuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        adminUserId: params.adminUserId || null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }
}
