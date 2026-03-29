import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { getVerificationEmailHtml } from './templates/customer-email-verification';
import { getPasswordResetEmailHtml } from './templates/customer-password-reset';
import { getOrderConfirmationEmailHtml } from './templates/order-confirmation';
import { getOrderStatusUpdateEmailHtml } from './templates/order-status-update';

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress = 'noreply@example.com';

  onModuleInit() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.fromAddress = process.env.SMTP_FROM || 'noreply@example.com';

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        ...(user && pass ? { auth: { user, pass } } : {}),
      });
      this.logger.log(`SMTP transport configured (${host}:${port})`);
    } else {
      this.logger.warn(
        'SMTP not configured — emails will be logged to console',
      );
    }
  }

  async sendVerificationEmail(
    email: string,
    name: string | null,
    token: string,
  ): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    if (!this.transporter) {
      this.logger.log(
        `[DEV] Verification email for ${email}\n  → ${verifyUrl}`,
      );
      return;
    }

    const html = getVerificationEmailHtml(name, verifyUrl);

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Verify your email address',
      html,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string | null,
    token: string,
  ): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    if (!this.transporter) {
      this.logger.log(
        `[DEV] Password reset email for ${email}\n  → ${resetUrl}`,
      );
      return;
    }

    const html = getPasswordResetEmailHtml(name, resetUrl);

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Reset your password',
      html,
    });
  }

  async sendOrderConfirmationEmail(params: {
    email: string;
    name: string | null;
    orderNo: string;
    items: Array<{
      productNameSnapshot: string;
      variantNameSnapshot?: string | null;
      skuSnapshot?: string | null;
      quantity: number;
      unitPriceCents: number;
      totalPriceCents: number;
    }>;
    totalPriceCents: number;
    currency: string;
    guestAccessToken?: string;
  }): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const orderUrl = params.guestAccessToken
      ? `${baseUrl}/orders/${params.orderNo}?token=${params.guestAccessToken}`
      : `${baseUrl}/account/orders/${params.orderNo}`;

    if (!this.transporter) {
      this.logger.log(`[DEV] Order confirmation email for ${params.email} — Order ${params.orderNo}`);
      return;
    }

    const html = getOrderConfirmationEmailHtml({
      name: params.name,
      orderNo: params.orderNo,
      items: params.items,
      totalPriceCents: params.totalPriceCents,
      currency: params.currency,
      orderUrl,
    });

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: params.email,
      subject: `Order Confirmed — ${params.orderNo}`,
      html,
    });
  }

  async sendOrderStatusUpdateEmail(params: {
    email: string;
    name: string | null;
    orderNo: string;
    status: string;
    guestAccessToken?: string;
  }): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const orderUrl = params.guestAccessToken
      ? `${baseUrl}/orders/${params.orderNo}?token=${params.guestAccessToken}`
      : `${baseUrl}/account/orders/${params.orderNo}`;

    if (!this.transporter) {
      this.logger.log(`[DEV] Order status update email for ${params.email} — Order ${params.orderNo} → ${params.status}`);
      return;
    }

    const html = getOrderStatusUpdateEmailHtml({
      name: params.name,
      orderNo: params.orderNo,
      status: params.status,
      orderUrl,
    });

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: params.email,
      subject: `Order Update — ${params.orderNo}`,
      html,
    });
  }
}
