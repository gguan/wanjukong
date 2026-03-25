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
   * Create a single-product "Buy Now" order using a specific variant.
   * Price is always computed server-side from the variant record.
   */
  async createBuyNow(dto: CreateBuyNowOrderDto) {
    // 1. Load product + brand/category
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

    // 2. Load variant
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: dto.variantId, productId: dto.productId },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found for this product');
    }

    if (variant.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('This variant is not available for purchase');
    }

    // 3. Availability check — only IN_STOCK and PREORDER are purchasable
    if (
      variant.availabilityType !== AvailabilityType.IN_STOCK &&
      variant.availabilityType !== AvailabilityType.PREORDER
    ) {
      throw new BadRequestException(
        `This variant is ${variant.availabilityType.toLowerCase().replace('_', ' ')} and cannot be purchased`,
      );
    }

    // 4. Stock check (using variant stock, only for IN_STOCK)
    if (
      variant.availabilityType === AvailabilityType.IN_STOCK &&
      variant.stock < dto.quantity
    ) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${variant.stock}`,
      );
    }

    // 5. Calculate pricing from variant
    const unitPriceCents = variant.priceCents;
    const totalItemCents = unitPriceCents * dto.quantity;
    const currency = dto.currency || 'USD';

    // 6. Generate order number
    const orderNo = this.generateOrderNo();

    // 7. Create order + item in a transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Deduct stock for IN_STOCK variants
      if (variant.availabilityType === AvailabilityType.IN_STOCK) {
        await tx.productVariant.update({
          where: { id: variant.id },
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
              variantId: variant.id,
              productNameSnapshot: product.name,
              productSlugSnapshot: product.slug,
              variantNameSnapshot: variant.name,
              skuSnapshot: variant.sku,
              brandNameSnapshot: product.brand?.name,
              categoryNameSnapshot: product.category?.name,
              coverImageUrlSnapshot:
                variant.coverImageUrl || product.imageUrl,
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
