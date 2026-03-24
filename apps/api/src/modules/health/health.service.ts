import { Injectable } from '@nestjs/common';
import { APP_NAME } from '@wanjukong/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    let database = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    return {
      ok: database === 'connected',
      service: `${APP_NAME}-api`,
      database,
    };
  }
}
