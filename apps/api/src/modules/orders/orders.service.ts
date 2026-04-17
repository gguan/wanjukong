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
import { toPublicUrl } from '../../utils/image-url';
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
  /** Filter orders to only those containing items from these brands */
  brandIds?: string[];
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

    const currency = dto.currency || 'USD';

    // Pick price field based on checkout currency
    const priceFor = (v: { priceCents: number; usdPriceCents: number | null }) =>
      currency === 'USD' ? (v.usdPriceCents ?? 0) : v.priceCents;

    // Validate USD prices configured when charging in USD
    if (currency === 'USD') {
      for (const item of dto.items) {
        const v = variants.find((x) => x.id === item.variantId);
        if (v && !v.usdPriceCents) {
          throw new BadRequestException(`商品 "${v.product?.name}" 未配置美元价格`);
        }
      }
    }

    // Compute per-item deposit (preorder) or full price (in-stock)
    const depositFor = (v: { priceCents: number; usdPriceCents: number | null; product: { depositCents: number | null; usdDepositCents: number | null; saleType: string } }) => {
      const price = priceFor(v);
      if (v.product.saleType !== 'PREORDER') return price;
      const configured = currency === 'USD' ? v.product.usdDepositCents : v.product.depositCents;
      if (configured && configured > 0) return Math.min(configured, price);
      // Fallback: 10% of price, rounded
      return Math.min(Math.round(price * 0.1), price);
    };

    // Calculate totals
    const subtotalCents = dto.items.reduce((sum, item) => {
      const v = variants.find((v) => v.id === item.variantId)!;
      return sum + priceFor(v) * item.quantity;
    }, 0);

    const discountCents = dto.discountCents || 0;
    const totalPriceCents = Math.max(0, subtotalCents - discountCents);

    // Deposit = sum of per-item deposit; balance = total - deposit
    const depositSum = dto.items.reduce((sum, item) => {
      const v = variants.find((v) => v.id === item.variantId)!;
      return sum + depositFor(v) * item.quantity;
    }, 0);
    const depositCentsOrder = Math.max(0, depositSum - discountCents);
    const balanceCentsOrder = Math.max(0, totalPriceCents - depositCentsOrder);
    const hasPreorder = dto.items.some((item) => {
      const v = variants.find((x) => x.id === item.variantId);
      return v?.product.saleType === 'PREORDER';
    });

    const orderNo = this.generateOrderNo();

    const order = await this.prisma.$transaction(async (tx) => {
      // Lock variant rows to prevent concurrent oversell (SELECT FOR UPDATE)
      for (const item of dto.items) {
        const locked = await tx.$queryRaw<Array<{ id: string; stock: number }>>`
          SELECT "id", "stock" FROM "ProductVariant"
          WHERE "id" = ${item.variantId}
          FOR UPDATE
        `;
        if (!locked.length || locked[0].stock < item.quantity) {
          const variant = variants.find((v) => v.id === item.variantId);
          throw new BadRequestException(
            `库存不足：${variant?.product?.name || item.variantId}`,
          );
        }
      }

      // Decrement stock for all items atomically
      for (const item of dto.items) {
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('库存不足');
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
          couponCode: dto.couponCode || null,
          discountCents,
          subtotalPriceCents: subtotalCents,
          totalPriceCents,
          isPreorder: hasPreorder,
          depositCents: depositCentsOrder,
          balanceCents: balanceCentsOrder,
          gracePeriodEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          depositPaidAt: (dto.paypalOrderId || dto.wechatTransactionId) ? new Date() : null,
          balancePaidAt:
            (dto.paypalOrderId || dto.wechatTransactionId) && balanceCentsOrder === 0
              ? new Date()
              : null,
          paypalOrderId: dto.paypalOrderId,
          wechatTransactionId: dto.wechatTransactionId,
          // Payment status depends on preorder + paid state:
          //   - Paid + no balance = PAID (in-stock only)
          //   - Paid + has balance = DEPOSIT_PAID (preorder)
          //   - Not paid = UNPAID
          paymentStatus: (dto.paypalOrderId || dto.wechatTransactionId)
            ? (balanceCentsOrder > 0 ? 'DEPOSIT_PAID' : 'PAID')
            : 'UNPAID',
          items: {
            create: dto.items.map((item) => {
              const v = variants.find((v) => v.id === item.variantId)!;
              const { product } = v;
              const itemIsPreorder = product.saleType === 'PREORDER';
              const itemDeposit = itemIsPreorder ? depositFor(v) * item.quantity : 0;
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
                unitPriceCents: priceFor(v),
                quantity: item.quantity,
                totalPriceCents: priceFor(v) * item.quantity,
                isPreorder: itemIsPreorder,
                depositCents: itemDeposit,
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

    return {
      ...order,
      items: order.items.map((i) => ({
        ...i,
        coverImageUrlSnapshot: toPublicUrl(i.coverImageUrlSnapshot),
      })),
    };
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

    if (query.brandIds?.length) {
      where.items = {
        some: {
          product: { brandId: { in: query.brandIds } },
        },
      };
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
        include: {
          items: { include: { product: { select: { brandId: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    // Mask items for brand managers
    const maskedData = query.brandIds?.length
      ? data.map((order) => this.maskOrderItems(order, query.brandIds!))
      : data;

    // Transform object keys to public URLs
    const transformed = maskedData.map((order) => ({
      ...order,
      items: order.items.map((i: any) => ({
        ...i,
        coverImageUrlSnapshot: toPublicUrl(i.coverImageUrlSnapshot),
      })),
    }));

    return { data: transformed, total, page, limit };
  }

  /**
   * Admin: dashboard stats — totals, breakdowns, low stock, recent orders.
   * When brandIds is provided, scopes everything to orders/products of those brands.
   */
  async getDashboardStats(brandIds?: string[]) {
    // Order filter: orders that contain at least one item from an allowed brand
    const orderWhere: Prisma.OrderWhereInput = brandIds?.length
      ? { items: { some: { product: { brandId: { in: brandIds } } } } }
      : {};
    const paidOrderWhere: Prisma.OrderWhereInput = {
      ...orderWhere,
      paymentStatus: 'PAID',
    };

    // Product/variant filter: only brands the admin manages
    const variantWhere: Prisma.ProductVariantWhereInput = {
      stock: { gt: 0, lte: 5 },
      product: {
        status: 'ACTIVE',
        ...(brandIds?.length ? { brandId: { in: brandIds } } : {}),
      },
    };

    const [totalOrders, totalRevenue, byStatus, byPaymentStatus, lowStockVariants, recentOrders] = await Promise.all([
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.aggregate({ _sum: { totalPriceCents: true }, where: paidOrderWhere }),
      this.prisma.order.groupBy({ by: ['status'], _count: true, where: orderWhere }),
      this.prisma.order.groupBy({ by: ['paymentStatus'], _count: true, where: orderWhere }),
      this.prisma.productVariant.findMany({
        where: variantWhere,
        include: { product: { include: { brand: true } } },
        orderBy: { stock: 'asc' },
        take: 10,
      }),
      this.prisma.order.findMany({
        where: orderWhere,
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
   * When brandIds is provided, masks items not belonging to those brands.
   */
  async findOne(id: string, brandIds?: string[]) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { brandId: true } } } },
        paymentIntents: true,
        refunds: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const masked = brandIds?.length
      ? this.maskOrderItems(order, brandIds)
      : order;

    return {
      ...masked,
      items: masked.items.map((i: any) => ({
        ...i,
        coverImageUrlSnapshot: toPublicUrl(i.coverImageUrlSnapshot),
      })),
    };
  }

  /**
   * Mask order items that don't belong to the given brands.
   * Brand managers see "其他品牌商品" for items outside their scope.
   */
  maskOrderItems<T extends { items: Array<Record<string, unknown>> }>(
    order: T,
    brandIds: string[],
  ): T {
    const maskedItems = order.items.map((item: any) => {
      const productBrandId = item.product?.brandId;
      if (productBrandId && brandIds.includes(productBrandId)) {
        return item; // belongs to allowed brand — show full details
      }
      // Mask: hide product details for other brands
      return {
        ...item,
        productNameSnapshot: '其他品牌商品',
        variantNameSnapshot: null,
        skuSnapshot: null,
        brandNameSnapshot: null,
        categoryNameSnapshot: null,
        coverImageUrlSnapshot: null,
        scaleSnapshot: null,
        unitPriceCents: 0,
        totalPriceCents: 0,
      };
    });

    return { ...order, items: maskedItems };
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
   * Validate a coupon code against a subtotal (read-only, for UI display).
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
      const minAmount = `¥${(coupon.minOrderCents / 100).toFixed(2)}`;
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

  /**
   * Atomically reserve a coupon: validate + increment usedCount in one transaction.
   * Prevents two concurrent orders from consuming the same limited coupon.
   */
  async reserveCoupon(code: string, subtotalCents: number) {
    const result = await this.validateCoupon(code, subtotalCents);

    // Atomic CAS: increment usedCount only when under the limit.
    // Uses raw SQL because Prisma can't express "usedCount < maxUsageTimes" in updateMany.
    const upperCode = code.toUpperCase();
    const rows = await this.prisma.$executeRaw`
      UPDATE "Coupon"
      SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW()
      WHERE "code" = ${upperCode}
        AND "isActive" = true
        AND ("maxUsageTimes" IS NULL OR "usedCount" < "maxUsageTimes")
    `;

    if (rows === 0) {
      throw new BadRequestException('优惠券已达使用上限');
    }

    return result;
  }

  /**
   * Release a previously reserved coupon (e.g. payment failed).
   */
  async releaseCoupon(code: string) {
    await this.prisma.coupon.updateMany({
      where: { code: code.toUpperCase(), usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  private generateOrderNo(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `WJK-${date}-${rand}`;
  }
}
