import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AvailabilityType, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBuyNowOrderDto } from './dto/create-buy-now-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a single-product "Buy Now" order.
   * Price is always computed server-side from the product record.
   */
  async createBuyNow(dto: CreateBuyNowOrderDto) {
    // 1. Load product
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { brand: true, category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available for purchase');
    }

    // 2. Stock check
    if (
      product.availability === AvailabilityType.IN_STOCK &&
      product.stock < dto.quantity
    ) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    // 3. Calculate pricing (convert Decimal price to cents)
    const unitPriceCents = Math.round(Number(product.price) * 100);
    const totalItemCents = unitPriceCents * dto.quantity;
    const currency = dto.currency || 'USD';

    // 4. Generate order number
    const orderNo = this.generateOrderNo();

    // 5. Create order + item in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Deduct stock for IN_STOCK items
      if (product.availability === AvailabilityType.IN_STOCK) {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: dto.quantity } },
        });
      }

      return tx.order.create({
        data: {
          orderNo,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          country: dto.country,
          stateOrProvince: dto.stateOrProvince,
          city: dto.city,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          postalCode: dto.postalCode,
          currency,
          subtotalPriceCents: totalItemCents,
          totalPriceCents: totalItemCents,
          items: {
            create: {
              productId: product.id,
              productNameSnapshot: product.name,
              productSlugSnapshot: product.slug,
              brandNameSnapshot: product.brand?.name,
              categoryNameSnapshot: product.category?.name,
              coverImageUrlSnapshot: product.imageUrl,
              scaleSnapshot: product.scale,
              unitPriceCents,
              quantity: dto.quantity,
              totalPriceCents: totalItemCents,
            },
          },
        },
        include: { items: true },
      });
    });

    return order;
  }

  /**
   * Find an order by its public-facing order number.
   */
  async findByOrderNo(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Admin: list all orders (newest first).
   */
  findAll() {
    return this.prisma.order.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin: find order by internal ID.
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // ── Helpers ──────────────────────────────────────────────

  private generateOrderNo(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `WJK-${date}-${rand}`;
  }
}
