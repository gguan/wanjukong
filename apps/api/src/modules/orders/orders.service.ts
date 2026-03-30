import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ProductStatus, Prisma } from '@prisma/client';
import { deriveProductDisplayAvailability } from '../../utils/product-sale-state';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBuyNowOrderDto } from './dto/create-buy-now-order.dto';
import { CreateCartOrderDto } from './dto/create-cart-order.dto';
import { MailerService } from '../mailer/mailer.service';

export interface FindAllOrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

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

    const displayAvailability = deriveProductDisplayAvailability({
      productStatus: product.status,
      saleType: product.saleType,
      preorderStartAt: product.preorderStartAt,
      preorderEndAt: product.preorderEndAt,
      now: new Date(),
      variantStocks: [variant.stock],
    });

    // 3. Availability check — only IN_STOCK and PREORDER are purchasable
    if (displayAvailability !== 'IN_STOCK' && displayAvailability !== 'PREORDER') {
      throw new BadRequestException(
        'Product is not currently available for purchase',
      );
    }

    // 4. Stock check (variant-level)
    if (variant.stock < dto.quantity) {
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
      const updated = await tx.productVariant.updateMany({
        where: { id: variant.id, stock: { gte: dto.quantity } },
        data: { stock: { decrement: dto.quantity } },
      });

      if (updated.count !== 1) {
        throw new BadRequestException('Insufficient stock');
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
   * Create a multi-item cart order (typically after PayPal payment).
   */
  async createCartOrder(dto: CreateCartOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Load all variants + products in one go
    const variantIds = dto.items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { include: { brand: true, category: true } } },
    });

    // Validate each cart item
    for (const item of dto.items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) throw new NotFoundException(`Variant ${item.variantId} not found`);
      if (variant.productId !== item.productId) throw new BadRequestException(`Variant/product mismatch`);

      const { product } = variant;
      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException(`Product "${product.name}" is not available`);
      }
      const availability = deriveProductDisplayAvailability({
        productStatus: product.status,
        saleType: product.saleType,
        preorderStartAt: product.preorderStartAt,
        preorderEndAt: product.preorderEndAt,
        now: new Date(),
        variantStocks: [variant.stock],
      });
      if (availability !== 'IN_STOCK' && availability !== 'PREORDER') {
        throw new BadRequestException(`Product "${product.name}" is not available for purchase`);
      }
      if (variant.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${product.name}"`);
      }
    }

    // Calculate totals
    const subtotalCents = dto.items.reduce((sum, item) => {
      const v = variants.find((v) => v.id === item.variantId)!;
      return sum + v.priceCents * item.quantity;
    }, 0);

    const currency = dto.currency || 'USD';
    const orderNo = this.generateOrderNo();

    const order = await this.prisma.$transaction(async (tx) => {
      // Decrement stock for all items atomically
      for (const item of dto.items) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Insufficient stock (race condition)');
        }
      }

      return tx.order.create({
        data: {
          orderNo,
          customerId: dto.customerId || null,
          guestAccessTokenHash: dto.guestAccessTokenHash || null,
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
          subtotalPriceCents: subtotalCents,
          totalPriceCents: subtotalCents,
          paypalOrderId: dto.paypalOrderId,
          wechatTransactionId: dto.wechatTransactionId,
          paymentStatus: (dto.paypalOrderId || dto.wechatTransactionId) ? 'PAID' : 'UNPAID',
          items: {
            create: dto.items.map((item) => {
              const v = variants.find((v) => v.id === item.variantId)!;
              const { product } = v;
              return {
                productId: product.id,
                variantId: v.id,
                productNameSnapshot: product.name,
                productSlugSnapshot: product.slug,
                variantNameSnapshot: v.name,
                skuSnapshot: v.sku,
                brandNameSnapshot: product.brand?.name,
                categoryNameSnapshot: product.category?.name,
                coverImageUrlSnapshot: v.coverImageUrl || product.imageUrl,
                scaleSnapshot: product.scale,
                unitPriceCents: v.priceCents,
                quantity: item.quantity,
                totalPriceCents: v.priceCents * item.quantity,
              };
            }),
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
   * Admin: list orders with pagination, search, and filtering.
   */
  async findAll(query: FindAllOrdersQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status as any;
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus as any;
    }

    if (query.search) {
      where.OR = [
        { orderNo: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Admin: dashboard stats — totals, breakdowns, low stock, recent orders.
   */
  async getDashboardStats() {
    const [totalOrders, totalRevenue, byStatus, byPaymentStatus, lowStockVariants, recentOrders] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({ _sum: { totalPriceCents: true }, where: { paymentStatus: 'PAID' } }),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
      this.prisma.order.groupBy({ by: ['paymentStatus'], _count: true }),
      this.prisma.productVariant.findMany({
        where: { stock: { gt: 0, lte: 5 }, product: { status: 'ACTIVE' } },
        include: { product: { include: { brand: true } } },
        orderBy: { stock: 'asc' },
        take: 10,
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { items: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of byStatus) statusCounts[row.status] = row._count;
    const paymentStatusCounts: Record<string, number> = {};
    for (const row of byPaymentStatus) paymentStatusCounts[row.paymentStatus] = row._count;

    return {
      totalOrders,
      totalRevenueCents: totalRevenue._sum.totalPriceCents || 0,
      byStatus: statusCounts,
      byPaymentStatus: paymentStatusCounts,
      lowStockVariants,
      recentOrders,
    };
  }

  /**
   * Admin: get order statistics by status.
   */
  async getOrderStats() {
    const [total, byStatus, byPaymentStatus] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.order.groupBy({
        by: ['paymentStatus'],
        _count: true,
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const row of byStatus) {
      statusCounts[row.status] = row._count;
    }

    const paymentStatusCounts: Record<string, number> = {};
    for (const row of byPaymentStatus) {
      paymentStatusCounts[row.paymentStatus] = row._count;
    }

    return { total, byStatus: statusCounts, byPaymentStatus: paymentStatusCounts };
  }

  /**
   * Admin: find order by internal ID.
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, paymentIntents: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * Admin: update order status.
   */
  async updateOrderStatus(id: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot change status of a cancelled order');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: status as any },
      include: { items: true },
    });

    // Send notification email (fire-and-forget)
    this.mailerService.sendOrderStatusUpdateEmail({
      email: updated.email,
      name: updated.fullName,
      orderNo: updated.orderNo,
      status,
    }).catch(() => {});

    return updated;
  }

  /**
   * Admin: update payment status.
   */
  async updatePaymentStatus(id: string, paymentStatus: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    return this.prisma.order.update({
      where: { id },
      data: { paymentStatus: paymentStatus as any },
      include: { items: true },
    });
  }

  /**
   * Guest order lookup: requires valid access token.
   */
  async findGuestOrderByOrderNoAndToken(orderNo: string, token: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // If order has a guest token, validate it
    if (order.guestAccessTokenHash) {
      if (order.guestAccessTokenHash !== tokenHash) {
        throw new ForbiddenException('Invalid access token');
      }
    }

    return order;
  }

  /**
   * Validate a coupon code against a subtotal.
   */
  async validateCoupon(code: string, subtotalCents: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or expired coupon code');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.maxUsageTimes !== null && coupon.usedCount >= coupon.maxUsageTimes) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }
    if (subtotalCents < coupon.minOrderCents) {
      const minAmount = `$${(coupon.minOrderCents / 100).toFixed(2)}`;
      throw new BadRequestException(`Minimum order amount for this coupon is ${minAmount}`);
    }

    let discountCents: number;
    if (coupon.discountType === 'PERCENTAGE') {
      discountCents = Math.round(subtotalCents * coupon.discountValue / 100);
    } else {
      discountCents = Math.min(coupon.discountValue, subtotalCents);
    }

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountCents,
    };
  }

  // ── Helpers ──────────────────────────────────────────────

  private generateOrderNo(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `WJK-${date}-${rand}`;
  }
}
