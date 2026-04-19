import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { normalizeLocale } from '../mailer/locale.util';

interface CreateShipmentInput {
  orderId: string;
  carrier: string;
  carrierName?: string;
  trackingNumber: string;
  isInternational?: boolean;
  estimatedDeliveryAt?: string;
  notes?: string;
  /** orderItemId → quantity; if empty, ships all unshipped items */
  items?: Array<{ orderItemId: string; quantity: number }>;
}

interface UpdateShipmentInput {
  carrier?: string;
  carrierName?: string;
  trackingNumber?: string;
  status?: string;
  isInternational?: boolean;
  estimatedDeliveryAt?: string;
  notes?: string;
}

const CARRIER_LABELS: Record<string, string> = {
  SF_EXPRESS: '顺丰速运',
  YTO: '圆通速递',
  ZTO: '中通快递',
  STO: '申通快递',
  YUNDA: '韵达快递',
  EMS: 'EMS',
  DHL: 'DHL',
  FEDEX: 'FedEx',
  UPS: 'UPS',
  OTHER: '其他',
};

const CARRIER_TRACKING_URLS: Record<string, string> = {
  SF_EXPRESS: 'https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/',
  YTO: 'https://www.yto.net.cn/ordertracking.html?waybillNo=',
  ZTO: 'https://www.zto.com/express/expressSearch.html?billCode=',
  EMS: 'https://www.ems.com.cn/queryList?queryParam=',
  DHL: 'https://www.dhl.com/en/express/tracking.html?AWB=',
  FEDEX: 'https://www.fedex.com/fedextrack/?trknbr=',
  UPS: 'https://www.ups.com/track?tracknum=',
};

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Get all shipments for an order
   */
  async findByOrder(orderId: string) {
    return this.prisma.shipment.findMany({
      where: { orderId },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a shipment for an order.
   * If no items specified, ships all unshipped order items.
   * Automatically updates order status to SHIPPED.
   */
  async create(input: CreateShipmentInput) {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        items: true,
        shipments: { include: { items: true } },
      },
    });

    if (!order) throw new NotFoundException('订单不存在');
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('已取消的订单不能创建发货单');
    }

    // Determine which items to ship
    let shipItems: Array<{ orderItemId: string; quantity: number }>;

    if (input.items?.length) {
      shipItems = input.items;
    } else {
      // Default: ship all items not yet fully shipped
      const shippedQtyMap = this.getShippedQuantityMap(order.shipments as any);
      shipItems = order.items
        .map((item) => ({
          orderItemId: item.id,
          quantity: item.quantity - (shippedQtyMap.get(item.id) || 0),
        }))
        .filter((i) => i.quantity > 0);
    }

    if (!shipItems.length) {
      throw new BadRequestException('没有需要发货的商品');
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: input.orderId,
        carrier: input.carrier as any,
        carrierName: input.carrierName,
        trackingNumber: input.trackingNumber,
        isInternational: input.isInternational ?? false,
        estimatedDeliveryAt: input.estimatedDeliveryAt
          ? new Date(input.estimatedDeliveryAt)
          : undefined,
        notes: input.notes,
        status: 'SHIPPED',
        shippedAt: new Date(),
        items: {
          create: shipItems.map((i) => ({
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: { include: { orderItem: true } } },
    });

    // Update order status
    await this.syncOrderStatus(input.orderId);

    // Send notification email (fire-and-forget)
    this.sendShipmentNotification(order, shipment).catch((err) =>
      this.logger.error('Failed to send shipment notification', err),
    );

    return shipment;
  }

  /**
   * Update a shipment (carrier, tracking, status, etc.)
   */
  async update(shipmentId: string, input: UpdateShipmentInput) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new NotFoundException('发货单不存在');

    const data: Record<string, unknown> = {};
    if (input.carrier !== undefined) data.carrier = input.carrier;
    if (input.carrierName !== undefined) data.carrierName = input.carrierName;
    if (input.trackingNumber !== undefined) data.trackingNumber = input.trackingNumber;
    if (input.isInternational !== undefined) data.isInternational = input.isInternational;
    if (input.estimatedDeliveryAt !== undefined) {
      data.estimatedDeliveryAt = new Date(input.estimatedDeliveryAt);
    }
    if (input.notes !== undefined) data.notes = input.notes;

    if (input.status !== undefined) {
      data.status = input.status;
      if (input.status === 'SHIPPED' && !shipment.shippedAt) {
        data.shippedAt = new Date();
      }
      if (input.status === 'DELIVERED' && !shipment.deliveredAt) {
        data.deliveredAt = new Date();
      }
    }

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data,
      include: { items: { include: { orderItem: true } } },
    });

    // Sync order status based on all shipments
    await this.syncOrderStatus(shipment.orderId);

    return updated;
  }

  /**
   * Delete a shipment
   */
  async remove(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    if (!shipment) throw new NotFoundException('发货单不存在');

    await this.prisma.shipment.delete({ where: { id: shipmentId } });
    await this.syncOrderStatus(shipment.orderId);

    return { ok: true };
  }

  /**
   * Automatically derive order status from its shipments:
   * - All items shipped & all shipments delivered → DELIVERED
   * - All items shipped → SHIPPED
   * - Otherwise keep CONFIRMED (if was SHIPPED before and shipment deleted)
   */
  private async syncOrderStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shipments: { include: { items: true } },
      },
    });

    if (!order || order.status === 'CANCELLED' || order.status === 'PENDING') {
      return;
    }

    const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
    const shippedQtyMap = this.getShippedQuantityMap(order.shipments as any);
    const totalShipped = Array.from(shippedQtyMap.values()).reduce(
      (s, q) => s + q,
      0,
    );

    const allDelivered =
      order.shipments.length > 0 &&
      order.shipments.every((s) => s.status === 'DELIVERED');

    let newStatus: string;
    if (allDelivered && totalShipped >= totalQty) {
      newStatus = 'DELIVERED';
    } else if (totalShipped >= totalQty) {
      newStatus = 'SHIPPED';
    } else {
      newStatus = 'CONFIRMED';
    }

    if (order.status !== newStatus) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: newStatus as any },
      });
    }
  }

  /**
   * Build a map of orderItemId → total shipped quantity across all shipments
   */
  private getShippedQuantityMap(
    shipments: Array<{ items: Array<{ orderItemId: string; quantity: number }> }>,
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const s of shipments) {
      for (const si of s.items) {
        map.set(si.orderItemId, (map.get(si.orderItemId) || 0) + si.quantity);
      }
    }
    return map;
  }

  /**
   * Send shipment notification email
   */
  private async sendShipmentNotification(
    order: { email: string; fullName: string; orderNo: string; locale: string },
    shipment: { carrier: string; carrierName?: string | null; trackingNumber: string },
  ) {
    const carrierLabel =
      shipment.carrierName || CARRIER_LABELS[shipment.carrier] || shipment.carrier;
    const trackingUrl =
      CARRIER_TRACKING_URLS[shipment.carrier]
        ? `${CARRIER_TRACKING_URLS[shipment.carrier]}${shipment.trackingNumber}`
        : undefined;

    await this.mailerService.sendShipmentNotificationEmail({
      email: order.email,
      name: order.fullName,
      orderNo: order.orderNo,
      carrierLabel,
      trackingNumber: shipment.trackingNumber,
      trackingUrl,
      locale: normalizeLocale(order.locale),
    });
  }
}
