import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const RECENT_ORDERS = 10;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(opts: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, opts.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;
    const search = opts.search?.trim();

    const where: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ],
        }
      : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          authProvider: true,
          emailVerifiedAt: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        phone: r.phone,
        authProvider: r.authProvider,
        emailVerifiedAt: r.emailVerifiedAt,
        isActive: r.isActive,
        lastLoginAt: r.lastLoginAt,
        createdAt: r.createdAt,
        orderCount: r._count.orders,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        wechatOpenId: true,
        authProvider: true,
        emailVerifiedAt: true,
        isActive: true,
        failedAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: RECENT_ORDERS,
          select: {
            id: true,
            orderNo: true,
            status: true,
            totalPriceCents: true,
            currency: true,
            createdAt: true,
          },
        },
        _count: { select: { orders: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const { _count, orders, ...rest } = customer;
    return {
      ...rest,
      recentOrders: orders,
      orderCount: _count.orders,
    };
  }
}
