import { Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        brandAssignments: {
          select: {
            brandId: true,
            brand: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) {
    const passwordHash = await argon2.hash(data.password);
    return this.prisma.adminUser.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        name: data.name,
        role: data.role as any,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(
    id: string,
    data: { email?: string; name?: string; role?: string; isActive?: boolean },
  ) {
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('管理员不存在');

    const updateData: Record<string, unknown> = {};
    if (data.email !== undefined)
      updateData.email = data.email.toLowerCase().trim();
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return this.prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async setBrandAssignments(adminUserId: string, brandIds: string[]) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
    });
    if (!user) throw new NotFoundException('管理员不存在');

    // Replace all assignments in a transaction
    await this.prisma.$transaction([
      this.prisma.adminBrandAssignment.deleteMany({
        where: { adminUserId },
      }),
      ...brandIds.map((brandId) =>
        this.prisma.adminBrandAssignment.create({
          data: { adminUserId, brandId },
        }),
      ),
    ]);

    return this.prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        brandAssignments: {
          select: {
            brandId: true,
            brand: { select: { id: true, name: true } },
          },
        },
      },
    });
  }
}
